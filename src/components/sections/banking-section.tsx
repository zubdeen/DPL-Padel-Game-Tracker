"use client"

import { SectionCard } from "@/components/SectionCard"
import {
  Wallet,
  CreditCard,
  Receipt,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  Circle,
  Minus
} from "lucide-react"
import { memo } from "react"
import { defaultSiteContent, useSiteContent } from "@/lib/site-content"

// DPL Fee Structure
const feeStructure = [
  {
    id: "registration",
    title: "League Registration Fee",
    amount: "P450",
    description: "Season 5 player registration",
    icon: CreditCard,
    required: true,
  },
  // {
  //   id: "kit",
  //   title: "Official Team Kit Fee",
  //   amount: "P75",
  //   description: "DPL branded team apparel",
  //   icon: Users,
  //   required: true,
  // },
  {
    id: "americano",
    title: "Americano Entry",
    amount: "P100",
    description: "Per event participation fee",
    icon: Receipt,
    required: false,
  },
]

// Payment status options for future use
type PaymentStatus = "pending" | "paid" | "partial" | "outstanding"

const statusConfig: Record<PaymentStatus, { label: string; bg: string; text: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", bg: "bg-primary/10", text: "text-primary", icon: Clock },
  paid: { label: "Paid", bg: "bg-emerald-500/10", text: "text-emerald-400", icon: CheckCircle2 },
  partial: { label: "Partial", bg: "bg-amber-500/10", text: "text-amber-400", icon: Minus },
  outstanding: { label: "Outstanding", bg: "bg-red-500/10", text: "text-red-400", icon: AlertCircle },
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg}`}>
      <Icon className={`h-3 w-3 ${config.text}`} />
      <span className={`text-[9px] font-semibold uppercase tracking-wide ${config.text}`}>
        {config.label}
      </span>
    </div>
  )
}

export const BankingSection = memo(function BankingSectionComponent() {
  const { data: configuredContent } = useSiteContent()
  const content = configuredContent ?? defaultSiteContent

  return (

    <div className="space-y-4">
      {/* Header Section */}
      <div className="py-4 text-center">
        <div className="flex justify-center mb-3">
          {/* <div className="relative w-20 h-20">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/dpl%20logo-QoMdRp1tM3lIBH85sldgWvooHx2otc.png"
              alt="Diamond Padel League"
              fill
              className="object-contain"
              priority
            />
          </div> */}
        </div>
        <h1 className="text-lg font-bold tracking-tight text-foreground uppercase">
                    {content.banking.title}

        </h1>
        <p className="text-[10px] text-muted-foreground mt-1">
                    {content.banking.intro}

        </p>
      </div>

      {/* Diamond divider */}
      <div className="flex items-center justify-center gap-1.5">
        <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/30 to-primary/50" />
        <div className="h-1 w-1 rotate-45 bg-primary/50" />
        <div className="h-px w-12 bg-gradient-to-l from-transparent via-primary/30 to-primary/50" />
      </div>

      {/* Payment Deadline Card
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/30 p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Payment Deadline
          </span>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">
          27 MAY 2026
        </p>
        <p className="text-[9px] text-muted-foreground mt-1">
          All payments must be completed before this date
        </p>
      </div> */}

      {/* Fee Structure */}
      <SectionCard
        title="Fee Structure"
        icon={<Wallet className="h-4 w-4 text-primary" />}
      >
        <div className="space-y-2.5">
          {feeStructure.map((fee) => {
            const Icon = fee.icon
            return (
              <div
                key={fee.id}
                className="flex items-center gap-3 rounded-xl p-3 bg-white/[0.02] border border-white/[0.05] transition-all duration-150 hover:bg-white/[0.04]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <Icon className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground text-[13px]">
                      {fee.title}
                    </p>
                    {fee.required && (
                      <span className="text-[7px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {fee.description}
                  </p>
                </div>

                <p className="text-lg font-bold text-primary">
                  {fee.amount}
                </p>
              </div>
            )
          })}

          {/* Total */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.06]">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total Required Fees
              </p>
              {/* <p className="text-[9px] text-muted-foreground/70">
                Registration + Kit
              </p> */}
            </div>
            <p className="text-xl font-bold text-foreground">
              P450
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Captain Payment System Info */}
      <SectionCard
        title="Payment Process"
        icon={<Users className="h-4 w-4 text-primary" />}
      >
        <div className="rounded-xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/30 border border-white/[0.05] p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25 flex-shrink-0 mt-0.5">
              <AlertCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-[13px] mb-1">
                Captain Coordinated Payments
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                All DPL payments are coordinated through your team captain for streamlined collection.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pl-11">
            <div className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Players will be contacted directly by their team captain regarding payments
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Captains are responsible for coordinating payment collection from all team members
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Payment account details or eWallet information will be shared by your captain
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Ensure all payments are completed before the deadline to secure your spot
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Wallet Status Placeholder */}
      <SectionCard
        title="Payment Status"
        icon={<Receipt className="h-4 w-4 text-primary" />}
      >
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] text-muted-foreground">
              Your current payment status
            </p>
            <StatusBadge status="pending" />
          </div>

          {/* Status Legend */}
          <div className="pt-3 border-t border-white/[0.05]">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-2.5">
              Status Guide
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(statusConfig) as PaymentStatus[]).map((status) => {
                const config = statusConfig[status]
                const Icon = config.icon
                return (
                  <div
                    key={status}
                    className="flex items-center gap-2 rounded-lg p-2 bg-white/[0.02]"
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md ${config.bg}`}>
                      <Icon className={`h-3 w-3 ${config.text}`} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {config.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Future Feature Note */}
          <div className="mt-4 pt-3 border-t border-white/[0.05]">
            <div className="flex items-center gap-2 text-muted-foreground/60">
              <Circle className="h-3 w-3" />
              <p className="text-[9px] italic">
                Real-time payment tracking coming soon
              </p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
})
