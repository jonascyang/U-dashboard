// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KpiCard } from "@/components/kpi-card";

describe("KpiCard", () => {
  it("renders value, delta24h, and baseline deviation", () => {
    render(<KpiCard title="TVL" value="$1.2B" delta24h="+2.1%" baselineDev="+0.8σ" />);
    expect(screen.getByText("TVL")).toBeInTheDocument();
    expect(screen.getByText("+2.1%")).toBeInTheDocument();
    expect(screen.getByText("+0.8σ")).toBeInTheDocument();
  });
});
