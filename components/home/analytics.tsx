import { ReportingWindow } from "@/components/product/analytics/visuals";
import { Container, Section, SectionIntro } from "./kit/primitives";

/**
 * Homepage reporting section. Scoped to what Tazama measures today — live
 * screen status and advertising performance (counted plays plus labelled
 * estimates). Content-play and audience analytics aren't real yet, so they
 * aren't shown here.
 */
export function Analytics() {
  return (
    <Section id="analytics" tone="snow" className="overflow-hidden">
      <Container wide>
        <SectionIntro
          index="11"
          kicker="Analytics"
          title={
            <>
              Know what’s live. <span className="text-white/40">And what’s working.</span>
            </>
          }
          body="See every screen’s status as it changes, and how each ad campaign performs — every play counted, with the estimates explained."
        />
        <div className="mt-14 sm:mt-20">
          <ReportingWindow />
        </div>
      </Container>
    </Section>
  );
}
