import { allocate, money } from "@/lib/portfolio";

export function AllocationBreakdown({
  rows,
  valid,
}: {
  rows: ReturnType<typeof allocate>;
  valid: boolean;
}) {
  const total = rows.reduce((sum, row) => sum + row.allocation, 0);
  return (
    <>
      <div className="allocation-cards">
        {rows.map((h) => (
          <article className="allocation-card" key={h.id}>
            <div className="allocation-card-heading">
              <div>
                <strong>{h.ticker || h.name}</strong>
                <small>{h.category}</small>
              </div>
              <strong className="allocation-value">
                {money(h.allocation)}
              </strong>
            </div>
            <dl>
              <div>
                <dt>Current</dt>
                <dd>{h.currentPercent.toFixed(1)}%</dd>
              </div>
              <div>
                <dt>Target</dt>
                <dd>{h.target}%</dd>
              </div>
              <div>
                <dt>After contribution</dt>
                <dd>{h.afterPercent.toFixed(1)}%</dd>
              </div>
            </dl>
            <div className="allocation-caption">
              {total ? ((h.allocation / total) * 100).toFixed(1) : "0.0"}% of
              this contribution
            </div>
          </article>
        ))}
      </div>
      <div className="table-scroll allocation-desktop">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Current / target</th>
              <th>Contribution share</th>
              <th>Suggested amount</th>
              <th>After contribution</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id}>
                <td>
                  <strong>{h.ticker || h.name}</strong>
                  <small className="block muted">{h.category}</small>
                </td>
                <td>
                  {h.currentPercent.toFixed(1)}% / {h.target}%
                </td>
                <td>
                  {total ? ((h.allocation / total) * 100).toFixed(1) : "0.0"}%
                </td>
                <td className="allocation-value">{money(h.allocation)}</td>
                <td>{h.afterPercent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="allocation-total">
        <span>Total contribution</span>
        <strong>{money(total)}</strong>
      </div>
      {!valid && (
        <p className="helper">
          Correct portfolio values to calculate this breakdown.
        </p>
      )}
    </>
  );
}
