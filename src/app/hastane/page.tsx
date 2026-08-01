import type { Metadata } from "next";

import { messages } from "@/config/messages";
import { StaffOnlyService } from "@/features/auth/components/StaffOnlyService";

/** Hastane randevusu — yalnızca kurum personeline açık (PRD §5.0). */
export const dynamic = "force-dynamic";

const copy = messages.staffServices.hospital;

export const metadata: Metadata = { title: copy.pageTitle };

export default function HospitalPage() {
  return <StaffOnlyService path="/hastane" title={copy.title} description={copy.description} />;
}
