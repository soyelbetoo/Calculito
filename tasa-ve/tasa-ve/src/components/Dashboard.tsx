"use client";

import { useState } from "react";
import RateBoard from "./RateBoard";
import GapCard from "./GapCard";
import HistoryChart from "./HistoryChart";
import AlertsPanel from "./AlertsPanel";
import InstallPrompt from "./InstallPrompt";
import type { CurrencyCode } from "@/lib/types";

export default function Dashboard() {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

  return (
    <>
      <RateBoard currency={currency} onCurrencyChange={setCurrency} />
      <GapCard currency={currency} />
      <HistoryChart currency={currency} />
      <AlertsPanel />
      <InstallPrompt />
    </>
  );
}
