import { Section, StatusPill,V3Warning } from "../components/chrome";

const sections = [
  ["Bradbury", "TruthMarket targets GenLayer Bradbury, chain ID 4221, RPC https://rpc-bradbury.genlayer.com, with GEN as the native token."],
  ["Accepted and Finalized", "Transactions are first Submitted, then Accepted - finalization pending. Accepted state can be readable before finalization. GenExplorer may show accepted (undetermined) during the finalization window."],
  ["AI Resolution Limits", "Validators receive URL strings, user notes, and timestamps only. Webpages are not fetched; source identity, accessibility, publication date, and content quality are not authenticated."],
  ["Locked funds and challenges", "V3 has no refund or cancellation route. No-evidence, UNRESOLVED, and zero-winning-pool cases can lock funds. Challenge evidence is stored but omitted from re-resolution, and there is no challenge waiting period."],
  ["Market Lifecycle", "Create a claim, stake YES/NO/INVALID before the deadline, submit evidence URLs, request resolution after deadline, optionally challenge an accepted resolution, finalize, then claim if your side won."],
  ["How to Test", "Copy .env.example, leave the contract address empty before deployment, run npm run dev, deploy the GenLayer contract separately, then set NEXT_PUBLIC_TRUTHMARKET_CONTRACT_ADDRESS to the deployed address."],
];

export default function DocsPage() {
  return (
    <main>
      <Section>
        <StatusPill value="Bradbury testnet documentation" />
        <h1 className="mt-4 text-4xl font-semibold">Docs</h1>
        <div className="mt-5"><V3Warning action /></div>
        <div className="mt-8 grid gap-5">
          {sections.map(([title, body]) => (
            <section key={title} className="border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">{body}</p>
            </section>
          ))}
        </div>
      </Section>
    </main>
  );
}
