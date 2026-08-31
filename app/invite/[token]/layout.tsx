/**
 * A narrow shell for the invitation page.
 *
 * It cannot use the signed-in app layout: the whole point is that the visitor
 * may have no account, and certainly has no farm context yet, so
 * requireFarmContext() would bounce them to onboarding.
 */
export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center p-4">
      {children}
    </main>
  );
}
