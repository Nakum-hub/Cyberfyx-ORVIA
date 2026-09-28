'use client';
import { useState } from 'react';
import { staffAuthClient } from '@orvia/auth/client';
import { useMutation } from '../../shared/api.ts';
import { hasCapability, useSession } from '../../shared/session-context.tsx';
import { TypeToDelete } from '../../shared/type-to-delete.tsx';
import { FailureState, NoticeBox, PageHead, Section } from '../../shared/ui.tsx';

/**
 * The signed-in person's own login. Anyone but the owner may delete it: the
 * owner is the one login an organisation cannot be left without.
 */
export function MyLogin() {
  const { session } = useSession();
  const [asking, setAsking] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const remove = useMutation('delete_own_login', true);
  if (deleted) return <NoticeBox tone="ok" title="Your login has been deleted"><p>You have been signed out and this login can no longer be used.</p><a href="/workspace/sign-in">Go to sign in</a></NoticeBox>;
  const mayDelete = hasCapability(session, 'account.own.delete');
  return (
    <>
      <PageHead eyebrow="Installation" title="My login" lede="Your own sign-in to this ORVIA installation." />
      <Section title="Delete my login">
        {session?.role === 'ORG_SUPER_ADMIN'
          ? <NoticeBox tone="info" title="The owner login cannot be deleted here"><p>Your organisation must always have its owner. The owner login is managed by the protected setup of this installation.</p></NoticeBox>
          : mayDelete
            ? <>
                <p>Deleting your login signs you out everywhere and it can never be used again. Your name stays on the records you created. An administrator can add you again later as a new login.</p>
                <button type="button" className="danger" onClick={() => { remove.newInteraction(); setAsking(true); }}>Delete my login</button>
              </>
            : <p>Your role does not allow deleting your own login.</p>}
      </Section>
      {asking && (
        <TypeToDelete title="Delete your login?" busy={remove.status === 'pending'} onCancel={() => setAsking(false)}
          onConfirm={async confirmation => {
            remove.newInteraction();
            if (await remove.run({ confirmation })) { setAsking(false); setDeleted(true); await staffAuthClient.signOut().catch(() => {}); }
          }}>
          <p>You will be signed out immediately and cannot sign in with this login again.</p>
          {remove.failure && <FailureState failure={remove.failure} />}
        </TypeToDelete>
      )}
    </>
  );
}
