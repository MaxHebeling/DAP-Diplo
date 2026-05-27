"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Check, Loader2, Mail, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  REJECTION_REASONS,
  type RejectionReasonValue,
} from "@/lib/admin/admissions/schemas";
import {
  approveAdmissionAction,
  rejectAdmissionAction,
  resendAdmissionLetterAction,
} from "@/lib/admin/admissions/actions";

type Props = {
  admissionId: string;
};

type ApprovedProps = Props & {
  status: string;
  letterSentAt: string | null;
};

export function AdmissionActions({ admissionId, status, letterSentAt }: ApprovedProps) {
  const t = useTranslations("AdmissionActions");
  const isApproved = status === "approved";
  return (
    <div className="flex flex-col items-stretch gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-grotesk text-sm font-semibold text-foreground">
          {t("decision")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isApproved
            ? letterSentAt
              ? t("approvedAndSent")
              : t("approvedPending")
            : t("decisionHelp")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {isApproved ? (
          <ResendLetterButton admissionId={admissionId} />
        ) : (
          <>
            <RejectButton admissionId={admissionId} />
            <ApproveButton admissionId={admissionId} />
          </>
        )}
      </div>
    </div>
  );
}

function ResendLetterButton({ admissionId }: Props) {
  const t = useTranslations("AdmissionActions");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handle() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("admissionId", admissionId);
      const res = await resendAdmissionLetterAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? t("letterResent"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Mail className="size-4" />
        {t("resendLetter")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("resendLetterTitle")}</DialogTitle>
          <DialogDescription>
            {t("resendLetterDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button onClick={handle} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("sending")}
              </>
            ) : (
              <>
                <Mail className="size-4" />
                {t("resendNow")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApproveButton({ admissionId }: Props) {
  const t = useTranslations("AdmissionActions");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handle() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("admissionId", admissionId);
      const res = await approveAdmissionAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? t("approved"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" />}>
        <Check className="size-4" />
        {t("approve")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("approveTitle")}</DialogTitle>
          <DialogDescription>
            {t("approveDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-500"
            onClick={handle}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("approving")}
              </>
            ) : (
              <>
                <Check className="size-4" />
                {t("confirmApprove")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectButton({ admissionId }: Props) {
  const t = useTranslations("AdmissionActions");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reasonValue, setReasonValue] =
    useState<RejectionReasonValue>("consent_invalid");
  const [customReason, setCustomReason] = useState("");

  function handle() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("admissionId", admissionId);
      fd.set("reasonValue", reasonValue);
      if (reasonValue === "other") fd.set("customReason", customReason.trim());
      const res = await rejectAdmissionAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? t("rejected"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <X className="size-4" />
        {t("reject")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rejectTitle")}</DialogTitle>
          <DialogDescription>
            {t("rejectDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {REJECTION_REASONS.map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.08] p-3 hover:border-white/[0.18]"
            >
              <input
                type="radio"
                name="reasonValue"
                value={r.value}
                checked={reasonValue === r.value}
                onChange={() => setReasonValue(r.value)}
                className="mt-1 accent-brand-coral"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{r.label}</p>
                {r.text && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.text}</p>
                )}
              </div>
            </label>
          ))}

          {reasonValue === "other" && (
            <div>
              <Label htmlFor="customReason" className="text-xs text-muted-foreground">
                {t("customReasonLabel")}
              </Label>
              <textarea
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.04] p-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
                placeholder={t("customReasonPlaceholder")}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handle}
            disabled={
              pending ||
              (reasonValue === "other" && customReason.trim().length < 5)
            }
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("rejecting")}
              </>
            ) : (
              <>
                <X className="size-4" />
                {t("confirmReject")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
