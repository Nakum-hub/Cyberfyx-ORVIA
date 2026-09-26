// The vendor/customer deployment boundary, enforced rather than described. Docker-free.
//
// The Rev 1.4 master separates four locations that are routinely collapsed into
// one "cloud" (§1869): the vendor website, vendor staff, the Lightning training
// workspace and the customer runtime. **This repository is the customer runtime
// and nothing else**, which §1995 states in one line: "Our website manages the
// commercial relationship. Their installation performs privacy operations.
// Their privacy portal serves their clients."
//
// The vendor-side interface — sign-in, subscription, ORVIA Account, the
// commercial catalogue, downloads and the vendor-support console — is not a
// second website. It is built as additional pages and sections on the existing
// ORVIA website, whose public marketing site is already the unauthenticated
// entry point to the first experience (§1974, §1995, §3796). Either way it is
// outside this installation, which is what these tests hold.
//
// That boundary is easy to erode one convenient screen at a time: a billing tab
// here, a "contact support" proxy there, and the installed product has quietly
// become a client of vendor infrastructure that §36 says must never receive
// customer operational data. These tests exist so that erosion fails the build
// instead of passing review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditActorDomain, Capability, routes } from '../../shared/contracts/src/index.ts';
import capabilities from '../../tracking/capabilities.json' with { type: 'json' };

/** §658, §3796: commercial administration is ORVIA Account, on the website. */
const COMMERCIAL = /billing|invoice|payment|checkout|subscription|purchase|price|pricing|tax|refund|cancellation|catalogue/i;
/** §3841: what a vendor console must never gain into the installed Workspace. */
const VENDOR_REACH_IN = /impersonat|remote.?session|vendor.?admin|vendor.?console|staff.?list|employee|proxy/i;
/** §3827, §3835: publishing and distribution are the website's, not the runtime's. */
const DISTRIBUTION = /download|distribut|marketplace|store_front|storefront/i;

test('there is no vendor actor anywhere in this product', () => {
  // The strongest form of the boundary: not "the vendor may not do much here"
  // but "there is no vendor to be". A route cannot be authored for an actor
  // domain that does not exist, so no future screen can quietly acquire one.
  const authorities = [...new Set(routes.map(route => route.authority))].sort();
  // SUPPLIER_LINK (EX08) is the customer's own processor answering the customer's
  // questionnaire through a link customer staff issued: one draft assessment,
  // expiring, revocable, no account. It is not the ORVIA vendor, and it carries
  // exactly one capability that grants nothing beyond that questionnaire.
  assert.deepEqual(authorities, ['MACHINE', 'PRINCIPAL', 'PUBLIC', 'STAFF', 'STAFF_OR_PRINCIPAL', 'SUPPLIER_LINK']);
  const supplierRoutes = routes.filter(route => route.authority === 'SUPPLIER_LINK');
  assert.deepEqual(supplierRoutes.map(route => [route.path.startsWith('/api/v1/supplier/'), route.capability]), supplierRoutes.map(() => [true, 'supplier.respond']));
  assert.ok(!authorities.some(a => /VENDOR/i.test(a)), 'a vendor authority exists');
  // And the audit trail cannot attribute an act to a vendor either, which is
  // what FR-M33-02's separation rests on.
  assert.deepEqual([...AuditActorDomain.options], ['STAFF', 'PRINCIPAL', 'MACHINE']);
  assert.ok(!Capability.options.some(c => /vendor/i.test(c)), 'a vendor capability exists');
});

test('no commercial surface is served from the customer runtime', () => {
  // §658: Commercial Owner, Billing Contact, Download/Licence Contact and
  // Support Contact are assigned in ORVIA Account on the vendor website, and
  // are explicitly "not customer-runtime administrators".
  // Cancelling a local privacy workflow is not cancelling a subscription.
  // Keep this exception bound to its exact authority and contract, so changing
  // the route into a commercial endpoint cannot evade the boundary check.
  const cancellation=routes.find(route=>route.id==='cancel_run');
  assert.ok(cancellation);
  assert.equal(cancellation.path,'/api/v1/admin/workflow-runs/{id}/cancellation');
  assert.equal(cancellation.method,'post');
  assert.equal(cancellation.authority,'STAFF');
  assert.equal(cancellation.capability,'operations.execute');
  assert.equal(cancellation.request,'RunCancel');
  assert.equal(cancellation.response,'WorkflowRun');
  const found = routes.filter(route => route!==cancellation && (COMMERCIAL.test(route.id) || COMMERCIAL.test(route.path)));
  assert.deepEqual(found.map(r => r.id), [], 'a commercial route was added to the customer runtime');
  // Nor any capability that would gate one.
  assert.deepEqual(Capability.options.filter(c => COMMERCIAL.test(c)), []);
});

test('nothing here is a vendor reach-in to the installed workspace', () => {
  // §3841 lists exactly what the vendor staff console must never gain: a synced
  // local staff list, an employee activity tab, a live operational dashboard, a
  // remote-session button, a runtime impersonation link or a proxy into the
  // installed Workspace. None of those can exist here because the routes that
  // would carry them do not exist.
  const found = routes.filter(route => VENDOR_REACH_IN.test(route.id) || VENDOR_REACH_IN.test(route.path));
  assert.deepEqual(found.map(r => r.id), [], 'a vendor reach-in surface was added');
  // Distribution is the website's job (§3827). The runtime verifies a signed
  // release it was given; it never fetches one.
  const distribution = routes.filter(route => DISTRIBUTION.test(route.id) || DISTRIBUTION.test(route.path));
  assert.deepEqual(distribution.map(r => r.id), [], 'a distribution route was added to the runtime');
});

test('the one vendor-named read is the customer looking outward, not the vendor looking in', () => {
  // FR-M32-04's report is the inverse of what §3841 forbids: rather than the
  // vendor gaining a window into this installation, the customer gains an
  // account of everything that ever left it. It must stay a customer-staff read.
  const vendorNamed = routes.filter(route => /vendor/i.test(route.id));
  assert.deepEqual(vendorNamed.map(r => r.id), ['vendor_visibility']);
  const [report] = vendorNamed;
  assert.deepEqual([report!.method, report!.authority, report!.capability], ['get', 'STAFF', 'health.read']);
  // It is a read. A vendor-facing product would need somewhere to write.
  assert.ok(!routes.some(r => /vendor/i.test(r.id) && r.method !== 'get'), 'a vendor-named write exists');
});

test('every route is served by the customer installation itself', () => {
  // §1941: the operational architecture is deployed in the customer's own
  // infrastructure, and nothing forwards to a vendor edge service. Every path is
  // relative to this installation; none names a host.
  for (const route of routes) {
    assert.ok(route.path.startsWith('/'), `${route.id} does not serve from this installation`);
    assert.ok(!/^https?:|\/\//.test(route.path.slice(1)), `${route.id} names an external origin`);
  }
  // §2265: with a valid locally verifiable licence, loss of the vendor
  // connection must not stop local privacy operations. Licensing here imports
  // and verifies a signed licence locally; it never renews one over the wire.
  const licence = routes.filter(r => /licence/i.test(r.id));
  assert.ok(licence.length > 0, 'licensing disappeared');
  assert.ok(!licence.some(r => /renew|activate|fetch|check_online|phone/i.test(r.id)),
    'a licence route reaches out to the vendor');
});

test('billing stays unbuilt here because it belongs to the website', () => {
  // M26 is not merely unfinished. Billing, metering and invoicing are ORVIA
  // Account concerns on the vendor website (§658, §3796), so the correct state
  // of this module in the customer runtime is that it does not exist. If it is
  // ever promoted here, that is a boundary breach and not progress.
  const m26 = capabilities.capabilities.find(m => m.module_id === 'M26')!;
  assert.equal(m26.implementation_status, 'NOT_IMPLEMENTED');
  assert.match(m26.limitation, /No billing, metering, invoicing or payment capability exists/);
});
