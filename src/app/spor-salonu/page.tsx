import type { Metadata } from "next";

import { messages } from "@/config/messages";
import { StaffOnlyService } from "@/features/auth/components/StaffOnlyService";

/** Spor salonu üyeliği — yalnızca kurum personeline açık (PRD §5.0). */
export const dynamic = "force-dynamic";

const copy = messages.staffServices.gym;

export const metadata: Metadata = { title: copy.pageTitle };

export default function GymPage() {
  return <StaffOnlyService path="/spor-salonu" title={copy.title} description={copy.description} />;
}
