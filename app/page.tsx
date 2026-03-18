import Background from "@/components/Background";
import { ButtonLink, Chip, Container, GlassCard, Logo, StatPill } from "@/components/ui";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Background />
      <Container>
        <div className="relative grid min-h-screen place-items-center py-14">
          <div className="w-full max-w-3xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5">
                <Logo />
              </div>
              <div className="mb-3 text-sm font-extrabold uppercase tracking-[0.35em] text-white/70">
                Knowledge · Speed · Glory
              </div>
              <Chip>Live Multiplayer</Chip>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <ButtonLink href="/random" tone="purple" className="h-14">
                Play Random
              </ButtonLink>
              <ButtonLink href="/create" tone="amber" className="h-14">
                Create Quiz
              </ButtonLink>
              <ButtonLink href="/join" tone="cyan" className="h-14">
                Join Quiz
              </ButtonLink>
            </div>

            <div className="mt-7">
              <GlassCard accent="purple" className="p-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <StatPill label="Players" value="20" />
                  <StatPill label="Questions" value="20" />
                  <StatPill label="Max pts" value="300" />
                  <StatPill label="Per Q" value="80s" />
                </div>
              </GlassCard>
            </div>

            <div className="mt-8 text-center text-sm font-semibold text-white/55">
              Built for ages <span className="text-white/85">8–18</span>. Fast rounds, fair scoring, epic glory.
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}

