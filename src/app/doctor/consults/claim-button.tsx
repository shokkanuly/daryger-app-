"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle } from "lucide-react";

interface ClaimButtonProps {
  consultationId: string;
}

export default function ClaimButton({ consultationId }: ClaimButtonProps) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);

  async function handleClaim() {
    setClaiming(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        router.push(`/doctor/consultations/${consultationId}`);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to claim referral");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while claiming referral");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <Button
      onClick={handleClaim}
      disabled={claiming}
      className="bg-teal-600 hover:bg-teal-700 text-white w-full flex items-center justify-center gap-1.5"
    >
      {claiming ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Claiming...
        </>
      ) : (
        <>
          <PlusCircle className="h-4 w-4" /> Claim Referral
        </>
      )}
    </Button>
  );
}
