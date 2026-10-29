import React, { useState } from "react";
import { STAGES, PROGRESS, INTEGRATION, LABELS } from "./constants.js";
import { Field } from "./components.jsx";
import { date } from "./dates.js";
export function Detail({
  detail: d,
  config,
  canWrite,
  busy,
  save,
  reload,
  note,
}) {
  const [tab, setTab] = useState("integration"),
    [noteText, setNoteText] = useState("");
  return (
    <>
      <div className="detail-title">
        <div>
          <small>MERCHANT ID · {d.code}</small>
          <h2>{d.name}</h2>
        </div>
        <span className={"badge stage-" + d.stage}>
          {STAGES[d.stage]} · {PROGRESS[d.stage]}%
        </span>
      </div>
      <div className="store-progress">
        <div>
          <b>Progresso desta loja</b>
          <strong>{PROGRESS[d.stage]}%</strong>
        </div>
        <div className="progress">
          <span style={{ width: PROGRESS[d.stage] + "%" }} />
        </div>
        <small>
          {STAGES[d.stage]} · Última alteração: {date(d.updated_at)}
        </small>
      </div>
      <div className="detail-timeline">
        {STAGES.map((s, i) => (
          <div
            key={s}
            className={
              i === d.stage ? "current" : i < d.stage ? "complete" : ""
            }
          >
            <span>{i < d.stage ? "✓" : i === d.stage ? "◉" : "○"}</span>
            <small>{s}</small>
            <em>
              {i < d.stage
                ? "Concluído"
                : i === d.stage
                  ? "Em andamento"
                  : "Pendente"}
            </em>
          </div>
        ))}
      </div>
      <div className="tabs">
        {[
          ["integration", "Timeline de integração"],
          ["details", "Dados e etapas"],
          ["notes", "Notas"],
          ["history", "Histórico"],
          ["source", "Planilha original"],
        ].map(([t, l]) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {l}
          </button>
        ))}
        <button onClick={reload}>↻ Recarregar</button>
      </div>
      {tab === "integration" && (
        <Integration detail={d} canWrite={canWrite} busy={busy} save={save} />
      )}
      {tab === "details" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget),
              body = Object.fromEntries(
                [...f].filter(([k]) => !k.startsWith("param-")),
              );
            body.stage = Number(body.stage);
            body.parameters = STAGES.map((_, i) => ({
              stage: i,
              value: f.get("param-" + i) || "",
            }));
            save(body);
          }}
        >
          <fieldset disabled={!canWrite || busy}>
            <div className="form-grid">
              {Object.entries(LABELS)
                .filter(([k]) => k !== "code")
                .map(([k, label]) => (
                  <Field
                    key={k}
                    name={k}
                    label={label}
                    defaultValue={d[k]}
                    required={k === "name"}
                  />
                ))}
              <label className="field">
                <span>Etapa do processo</span>
                <select name="stage" defaultValue={d.stage}>
                  <option value={d.stage}>{STAGES[d.stage]}</option>
                  {d.stage < 6 && (
                    <option value={d.stage + 1}>
                      {STAGES[d.stage + 1]} → próxima etapa
                    </option>
                  )}
                </select>
              </label>
            </div>
            <h3>Parâmetros por etapa</h3>
            <div className="stage-fields">
              {STAGES.map((s, i) => (
                <label
                  key={s}
                  className={"stage-field " + (i === d.stage ? "current" : "")}
                >
                  <b>
                    {String(i + 1).padStart(2, "0")} · {s}
                  </b>
                  <span>{config[i]?.label || "Orientações"}</span>
                  {config[i]?.instructions && (
                    <small>{config[i].instructions}</small>
                  )}
                  <textarea
                    name={"param-" + i}
                    maxLength={3000}
                    defaultValue={
                      d.parameters.find((p) => p.stage === i)?.value || ""
                    }
                    placeholder="Registre as informações desta etapa…"
                  />
                </label>
              ))}
            </div>
            {canWrite && (
              <button className="primary" disabled={busy}>
                Salvar alterações
              </button>
            )}
          </fieldset>
        </form>
      )}
      {tab === "notes" && (
        <>
          {canWrite && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (await note(noteText)) setNoteText("");
              }}
            >
              <textarea
                aria-label="Nova nota"
                required
                maxLength={3000}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Adicione contexto para a equipe…"
              />
              <button className="primary" disabled={busy}>
                Adicionar nota
              </button>
            </form>
          )}
          {d.notes.map((n) => (
            <div className="note" key={n.id}>
              <b>{n.author}</b>
              <small>{date(n.created_at)}</small>
              <p>{n.body}</p>
            </div>
          ))}
          {!d.notes.length && <p>Nenhuma nota registrada.</p>}
        </>
      )}
      {tab === "history" && (
        <>
          <p>Últimos 100 eventos. O histórico completo permanece no banco.</p>
          {d.history.map((h) => (
            <div className="note" key={h.id}>
              <b>
                {h.action} · {h.author}
              </b>
              <small>{date(h.created_at)}</small>
              <details>
                <summary>Ver alterações</summary>
                <pre>{JSON.stringify(JSON.parse(h.details), null, 2)}</pre>
              </details>
            </div>
          ))}
        </>
      )}
      {tab === "source" && (
        <>
          <p>
            Dados preservados da primeira importação. Reimportações não
            sobrescrevem este registro.
          </p>
          <div className="source-grid">
            {Object.entries(d.source).map(([k, v]) => (
              <div key={k}>
                <small>{k.replaceAll("Delivery", "Processos")}</small>
                <span>{String(v) || "—"}</span>
              </div>
            ))}
          </div>
          {!Object.keys(d.source).length && (
            <p>Cadastro manual, sem planilha de origem.</p>
          )}
        </>
      )}
    </>
  );
}
function Integration({ detail: d, canWrite, busy, save }) {
  const [search, setSearch] = useState({});
  const current = (i) =>
    d.integrations.find((x) => x.section === i) || {
      state: "Pendente",
      data: {},
    };
  return (
    <>
      <p>
        Acompanhe a integração por seção. Este checklist é independente do
        status geral da loja.
      </p>
      <div className="integration-timeline">
        {INTEGRATION.map(([title], i) => (
          <div
            key={title}
            className={
              "integration-state " + current(i).state.replaceAll(" ", "-")
            }
          >
            <b>
              {current(i).state === "Concluído"
                ? "✓"
                : current(i).state === "Bloqueado"
                  ? "!"
                  : "◷"}
            </b>
            <span>{title}</span>
            <small>{current(i).state}</small>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          save({
            integrations: INTEGRATION.map(([_, fields], i) => ({
              section: i,
              state: f.get("state-" + i),
              data: Object.fromEntries(
                fields.map((field, j) => [
                  field,
                  f.get("int-" + i + "-" + j) || "",
                ]),
              ),
            })),
          });
        }}
      >
        <fieldset disabled={!canWrite || busy}>
          <div className="integration-columns">
            <div className="integration-store">
              <span className="eyebrow">LOJA</span>
              <h3>{d.name}</h3>
              <small>#{d.code}</small>
              {[
                ["Responsável pela loja (BD)", d.owner],
                ["Líder responsável", d.source["Merchant Owner Superior"]],
                ["AOR", d.source["Aor Name"]],
                ["Nome da marca", d.source["Brand Name"]],
                ["Categoria", d.source["Primary Category"]],
                ["Fornecedor PDV", d.source["Expected PDV (API) provider"]],
              ].map(([k, v]) => (
                <div key={k}>
                  <small>{k}</small>
                  <p>{v || "—"}</p>
                </div>
              ))}
            </div>
            {INTEGRATION.map(([title, fields], i) => (
              <section key={title}>
                <h3>{title}</h3>
                <input
                  className="section-search"
                  aria-label={"Buscar em " + title}
                  placeholder="Buscar nesta seção…"
                  value={search[i] || ""}
                  onChange={(e) =>
                    setSearch({ ...search, [i]: e.target.value })
                  }
                />
                <label className="field">
                  <span>Andamento da seção</span>
                  <select name={"state-" + i} defaultValue={current(i).state}>
                    {["Pendente", "Em andamento", "Concluído", "Bloqueado"].map(
                      (s) => (
                        <option key={s}>{s}</option>
                      ),
                    )}
                  </select>
                </label>
                {fields.map((field, j) => (
                  <div
                    key={field}
                    hidden={
                      ![field, current(i).data[field] || ""]
                        .join(" ")
                        .toLocaleLowerCase("pt-BR")
                        .includes((search[i] || "").toLocaleLowerCase("pt-BR"))
                    }
                  >
                    <Field
                      label={field}
                      name={"int-" + i + "-" + j}
                      maxLength={1000}
                      defaultValue={
                        current(i).data[field] ||
                        (i === 2 && j === 0
                          ? d.method
                          : i === 3 && j === 1
                            ? d.source["visible spu count"]
                            : i === 4 && j === 0
                              ? d.source["Merchant Activity Summary"]
                              : "") ||
                        ""
                      }
                    />
                  </div>
                ))}
              </section>
            ))}
          </div>
          {canWrite && (
            <button className="primary" disabled={busy}>
              Salvar integração
            </button>
          )}
        </fieldset>
      </form>
    </>
  );
}
