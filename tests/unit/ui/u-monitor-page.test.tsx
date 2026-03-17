// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OverviewPage from "@/app/page";

describe("U monitor page", () => {
  it("renders the dashboard shell", () => {
    render(<OverviewPage />);

    expect(screen.getByText("U Stablecoin Monitor")).toBeInTheDocument();
    expect(screen.getByText("Loading monitor...")).toBeInTheDocument();
  });
});
