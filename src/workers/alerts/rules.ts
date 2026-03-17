export type AlertLevel = "critical" | "warning" | "info";

export type AlertMetricInput = {
  hourTs: string;
  marketId?: string;
  utilization: number;
  atRiskDebtRatio: number;
  liquidationUsd24h: number;
  liquidationBaselineMedian?: number;
  netFlowUsd24h?: number;
  tvlUsd?: number;
  revenueUsd24h?: number;
  revenueBaselineAvg?: number;
  activeUsers24h?: number;
  activeUsersBaselineAvg?: number;
  securityEventLevel?: "high" | "low" | "none";
};

export type ProposedAlert = {
  level: AlertLevel;
  ruleCode: string;
  metricKey: string;
  currentValue: number;
  thresholdValue?: number;
  baselineValue?: number;
  dedupKey: string;
  marketId?: string;
};

function withDedup(input: AlertMetricInput, alert: Omit<ProposedAlert, "dedupKey">): ProposedAlert {
  return {
    ...alert,
    dedupKey: `${alert.ruleCode}:${input.marketId ?? "protocol"}`
  };
}

export function evaluateRules(input: AlertMetricInput): ProposedAlert[] {
  const out: ProposedAlert[] = [];

  if (input.atRiskDebtRatio > 0.12) {
    out.push(
      withDedup(input, {
        level: "critical",
        ruleCode: "RISK_DEBT_RATIO_HIGH",
        metricKey: "atRiskDebtRatio",
        currentValue: input.atRiskDebtRatio,
        thresholdValue: 0.12,
        marketId: input.marketId
      })
    );
  } else if (input.atRiskDebtRatio > 0.08) {
    out.push(
      withDedup(input, {
        level: "warning",
        ruleCode: "RISK_DEBT_RATIO_WARNING",
        metricKey: "atRiskDebtRatio",
        currentValue: input.atRiskDebtRatio,
        thresholdValue: 0.08,
        marketId: input.marketId
      })
    );
  }

  if (input.utilization > 0.92) {
    out.push(
      withDedup(input, {
        level: "critical",
        ruleCode: "UTILIZATION_CRITICAL",
        metricKey: "utilization",
        currentValue: input.utilization,
        thresholdValue: 0.92,
        marketId: input.marketId
      })
    );
  } else if (input.utilization > 0.85) {
    out.push(
      withDedup(input, {
        level: "warning",
        ruleCode: "UTILIZATION_WARNING",
        metricKey: "utilization",
        currentValue: input.utilization,
        thresholdValue: 0.85,
        marketId: input.marketId
      })
    );
  }

  if (input.liquidationBaselineMedian && input.liquidationUsd24h > input.liquidationBaselineMedian * 3) {
    out.push(
      withDedup(input, {
        level: "critical",
        ruleCode: "LIQUIDATION_SPIKE",
        metricKey: "liquidationUsd24h",
        currentValue: input.liquidationUsd24h,
        baselineValue: input.liquidationBaselineMedian,
        marketId: input.marketId
      })
    );
  }

  if (input.tvlUsd && input.netFlowUsd24h !== undefined && input.netFlowUsd24h < -input.tvlUsd * 0.03) {
    out.push(
      withDedup(input, {
        level: "warning",
        ruleCode: "NET_FLOW_NEGATIVE",
        metricKey: "netFlowUsd24h",
        currentValue: input.netFlowUsd24h,
        thresholdValue: -input.tvlUsd * 0.03,
        marketId: input.marketId
      })
    );
  }

  if (
    input.revenueBaselineAvg &&
    input.revenueUsd24h !== undefined &&
    input.revenueUsd24h < input.revenueBaselineAvg * 0.6
  ) {
    out.push(
      withDedup(input, {
        level: "warning",
        ruleCode: "REVENUE_DROP",
        metricKey: "revenueUsd24h",
        currentValue: input.revenueUsd24h,
        baselineValue: input.revenueBaselineAvg,
        marketId: input.marketId
      })
    );
  }

  if (
    input.activeUsersBaselineAvg &&
    input.activeUsers24h !== undefined &&
    input.activeUsers24h < input.activeUsersBaselineAvg * 0.65
  ) {
    out.push(
      withDedup(input, {
        level: "warning",
        ruleCode: "ACTIVE_USERS_DROP",
        metricKey: "activeUsers24h",
        currentValue: input.activeUsers24h,
        baselineValue: input.activeUsersBaselineAvg,
        marketId: input.marketId
      })
    );
  }

  if (input.securityEventLevel === "high") {
    out.push(
      withDedup(input, {
        level: "critical",
        ruleCode: "SECURITY_HIGH_RISK_EVENT",
        metricKey: "securityEvents24h",
        currentValue: 1,
        marketId: input.marketId
      })
    );
  } else if (input.securityEventLevel === "low") {
    out.push(
      withDedup(input, {
        level: "info",
        ruleCode: "SECURITY_LOW_RISK_EVENT",
        metricKey: "securityEvents24h",
        currentValue: 1,
        marketId: input.marketId
      })
    );
  }

  return out;
}
