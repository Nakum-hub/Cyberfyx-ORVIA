'use client';
import { NoticeBox } from '../../../components/shared/ui.tsx';
import { VendorArea } from '../../../components/vendor/vendor.tsx';

/** Placeholder only: Razorpay is the chosen provider but activation waits on KYC, approved prices and GST (docs/engineering/PAYMENTS_PROVIDER_DECISION.md). */
export default function Page() {
  return <VendorArea capability="payments.read">{() => <>
    <div className="page-head"><h2>Payments</h2><p>Indian payment providers only.</p></div>
    <NoticeBox tone="warn" title="Not active"><p>Razorpay is the chosen provider. Payments are not collected here until KYC, approved prices and GST treatment are in place. No payment has been taken and no amount shown anywhere in ORVIA is a price.</p></NoticeBox>
  </>}</VendorArea>;
}
