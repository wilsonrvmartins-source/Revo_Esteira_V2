import React, { useState } from "react";
import { LABELS } from "./constants.js";
import { Field } from "./components.jsx";
import { api } from "./api.js";
export function Import({ canWrite, busy, act, done }) {
  const [preview, setPreview] = useState(null),
    [mode, setMode] = useState("skip"),
    [fields, setFields] = useState([]);
  return (
    <>
      <h2>Importar com segurança</h2>
      <p>
        O Merchant ID identifica cada loja. Reenviar a planilha não cria
        duplicatas.
      </p>
      <div className="info">
        <b>Seus registros existentes ficam protegidos.</b>
        <p>
          Por padrão, apenas novas lojas são cadastradas. Status, notas e
          parâmetros existentes nunca são alterados pelo Excel. Campos vazios
          não apagam informações.
        </p>
      </div>
      <a className="text-button" href="/api/template.xlsx">
        ↓ Baixar modelo de planilha
      </a>
      <p className="muted">
        Aceita o relatório shop com 48 colunas ou o modelo REVO. Até 2.000
        linhas e 3 MB. Novas lojas recebem o status da origem; sem status,
        começam em Não reivindicado.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          act(async () => {
            setPreview(
              await api("/import/preview", { method: "POST", body: f }),
            );
            setMode("skip");
            setFields([]);
          });
        }}
      >
        <Field
          label="Planilha Excel (.xlsx)"
          type="file"
          accept=".xlsx"
          name="file"
          required
        />
        <button disabled={busy || !canWrite}>Analisar arquivo</button>
      </form>
      {preview && (
        <>
          <div className="import-counts">
            {[
              ["new", "Novas"],
              ["existing", "Existentes"],
              ["duplicate", "Repetidas no arquivo"],
              ["invalid", "Inválidas"],
            ].map(([k, l]) => (
              <div key={k}>
                <b>{preview.plan.filter((r) => r.kind === k).length}</b>
                <small>{l}</small>
              </div>
            ))}
          </div>
          <label className="field">
            <span>Como tratar lojas existentes?</span>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="skip">
                Preservar todas as lojas existentes (recomendado)
              </option>
              <option value="update">
                Atualizar somente os campos que eu selecionar
              </option>
            </select>
          </label>
          {mode === "update" && (
            <div className="checkboxes">
              {Object.entries(LABELS)
                .filter(([k]) => k !== "code" && preview.columns.includes(k))
                .map(([k, l]) => (
                  <label key={k}>
                    <input
                      type="checkbox"
                      checked={fields.includes(k)}
                      onChange={(e) =>
                        setFields(
                          e.target.checked
                            ? [...fields, k]
                            : fields.filter((x) => x !== k),
                        )
                      }
                    />
                    {l}
                  </label>
                ))}
            </div>
          )}
          <div className="preview table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Merchant ID</th>
                  <th>Loja</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {preview.plan.map((r, i) => (
                  <tr key={i}>
                    <td>{r.row}</td>
                    <td>{r.item?.code || "—"}</td>
                    <td>{r.item?.name || r.message}</td>
                    <td>
                      {r.kind === "new"
                        ? "Cadastrar"
                        : r.kind === "existing"
                          ? mode === "skip"
                            ? "Preservar"
                            : "Atualizar campos selecionados"
                          : r.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="primary"
            disabled={
              busy ||
              !preview.plan.length ||
              (mode === "update" && !fields.length)
            }
            onClick={() =>
              act(async () =>
                done(
                  await api("/import/commit", {
                    method: "POST",
                    body: { id: preview.id, mode, fields },
                  }),
                ),
              )
            }
          >
            Confirmar importação
          </button>
          <small className="muted">
            A prévia expira em 10 minutos. Linhas inválidas e repetidas serão
            ignoradas.
          </small>
        </>
      )}
    </>
  );
}
