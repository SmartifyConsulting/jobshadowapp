export function CompanyBenefits() {
  return (
    <section
      id="company-benefits"
      className="mt-6 scroll-mt-36 space-y-4 rounded border border-border bg-teal p-4 sm:p-5"
    >
      <h2 className="font-display text-2xl">Why Companies Participate</h2>
      <p className="text-sm">
        Help scholars and tertiary students discover real careers while recognising the contribution
        of your employees.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          [
            "Support Future Talent",
            "Give participants practical workplace exposure, a clearer understanding of careers and insight into the skills they can develop.",
          ],
          [
            "Support Skills Development",
            "Qualifying activities may support your company’s Skills Development reporting, depending on the programme, applicable B-BBEE code and verification requirements. Job-shadow attendance alone does not guarantee points.",
          ],
          [
            "Support CSI and SED Reporting",
            "Keep evidence of participation, learning activities and verified mentoring hours. In South Africa, qualifying activities may support B-BBEE Socio-Economic Development (SED) recognition. CSI participation does not automatically qualify as SED.",
          ],
          [
            "Receive a Company Payment",
            "The company payment is 10% of the amount actually paid for completed job shadows, excluding cancelled or refunded bookings and subject to Admin approval. This commercial benefit is separate from CSI, SED and Skills Development recognition.",
          ],
        ].map(([title, body]) => (
          <section key={title} className="rounded border border-border bg-teal p-4">
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="mt-2 text-sm">{body}</p>
          </section>
        ))}
      </div>
      <section
        className="rounded border border-border bg-teal p-4 space-y-3"
        aria-label="Illustrative SED example"
      >
        <h3 className="text-sm font-bold">An Example of Potential SED Value</h3>
        <p className="text-sm">
          Illustration for a qualifying South African programme: assume an employee’s monthly salary
          is R40,000. Dividing by 160 gives R250 per hour. Where an 80% employee-time recognition
          factor applies:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2">Example</th>
                <th className="p-2">Participants</th>
                <th className="p-2">Mentor Hours</th>
                <th className="p-2">Estimated Contribution Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="p-2">One mentor hosts ten students together for five hours</td>
                <td className="p-2">10</td>
                <td className="p-2">5</td>
                <td className="p-2">R1,000</td>
              </tr>
              <tr>
                <td className="p-2">Ten mentors each host one student for five hours</td>
                <td className="p-2">10</td>
                <td className="p-2">50</td>
                <td className="p-2">R10,000</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm">
          These examples value actual mentor time, not participant-hours. They assume the programme
          and beneficiaries qualify for full recognition of the calculated contribution. Beneficiary
          allocation and the applicable code may reduce the recognised amount. Figures are not cash
          reimbursements, tax savings or awarded points.
        </p>
        <p className="text-sm">
          Some Skills Development indicators count participants in specified qualifying programmes.
          A job shadow is not automatically a qualifying learnership, apprenticeship or internship.
          Confirm programme eligibility with your verification professional before claiming
          recognition.
        </p>
        <p className="text-xs text-muted-foreground">
          South African example only; other countries have different rules. Sources checked 27
          November 2026:{" "}
          <a
            className="underline"
            href="https://www.thedtic.gov.za/wp-content/uploads/Amended_Financial_Sector_Code.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Financial Sector Code, FS300 and FS500
          </a>{" "}
          and{" "}
          <a
            className="underline"
            href="https://www.thedtic.gov.za/financial-and-non-financial-support/b-bbee/faqs/"
            target="_blank"
            rel="noopener noreferrer"
          >
            dtic guidance
          </a>
          . Your company’s applicable code determines recognition.
        </p>
      </section>
      <p className="text-sm">
        A useful evidence pack records participants reached, learning activities and outcomes,
        actual mentor hours and supporting documents. Reach and contribution value are separate
        measures.
      </p>
      <a
        href="/contact?type=host#contact-form"
        className="inline-flex rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Discuss Company Participation
      </a>
    </section>
  );
}
