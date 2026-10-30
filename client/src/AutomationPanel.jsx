import React, { useState, useEffect } from "react";
import { api } from "./api.js";
import { LABELS } from "./constants.js";
export function AutomationPanel({ isAdmin }) {
  const [state, setState] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const load = () => api("/automation/import").then(setState);
  useEffect(() => {
    load().catch((e) => setError(e.message));
    const timer = setInterval(
      () => load().catch((e) => setError(e.message)),
      5000,
    );
    return () => clearInterval(timer);
  }, []);
  async function act(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2>Importação automática</h2>
      <p>
        Uma pasta central para as planilhas enviadas de qualquer computador.
      </p>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="info">
          {message}
        </div>
      )}
      {state && (
        <>
          <div className="automation-status">
            <span
              className={"badge " + (state.enabled ? "stage-4" : "stage-3")}
            >
              {state.enabled ? "Monitoramento ativo" : "Monitoramento pausado"}
            </span>
            {isAdmin && (
              <button
                disabled={busy}
                onClick={() =>
                  act(() =>
                    api("/automation/import", {
                      method: "PUT",
                      body: { enabled: !state.enabled },
                    }),
                  )
                }
              >
                {state.enabled ? "Pausar" : "Ativar"}
              </button>
            )}
            <button
              disabled={busy}
              onClick={() =>
                act(() => api("/automation/import/scan", { method: "POST" }))
              }
            >
              ↻ Verificar pasta
            </button>
          </div>
          <label className="field">
            <span>Pasta de origem no servidor</span>
            <input aria-label="Pasta de origem" readOnly value={state.folder} />
          </label>
          <p className="muted">
            Verificação a cada {state.intervalSeconds} segundos. O arquivo
            precisa ficar estável por {state.settleSeconds} segundos antes da
            leitura. Última verificação:{" "}
            {state.lastChecked
              ? new Date(state.lastChecked).toLocaleString("pt-BR")
              : "aguardando"}
            .
          </p>
          {state.lastError && <div className="error">{state.lastError}</div>}
          <div className="info">
            <b>Atualização sem duplicatas e sem perder o trabalho da equipe.</b>
            <p>
              Merchant ID identifica a loja. Arquivos com o mesmo conteúdo são
              processados uma única vez, mesmo com outro nome ou após reiniciar
              o servidor. Status, notas e integração são preservados; campos
              alterados manualmente ficam protegidos. Valores vazios não apagam
              informações.
            </p>
          </div>
          <h3>Adicionar planilhas à pasta</h3>
          <p>
            Use este envio a partir de qualquer computador com acesso à
            aplicação. Para acompanhar uma pasta local sem upload, será
            necessário conectá-la por sincronização.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget,
                files = [...form.elements.file.files];
              act(async () => {
                let queued = 0,
                  known = 0;
                for (const file of files) {
                  const body = new FormData();
                  body.append("file", file);
                  const r = await api("/automation/import/files", {
                    method: "POST",
                    body,
                  });
                  r.queued ? queued++ : known++;
                }
                setMessage(
                  `${queued} arquivo(s) enviado(s) à pasta; ${known} já registrado(s). ${state.enabled ? "A importação ocorrerá após a estabilização do arquivo." : "Ative o monitoramento para processar a fila."}`,
                );
                form.reset();
              });
            }}
          >
            <label className="field">
              <span>Arquivos Excel (.xlsx)</span>
              <input name="file" type="file" accept=".xlsx" multiple required />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Aguarde…" : "Enviar para a pasta"}
            </button>
          </form>
          <h3>Histórico da pasta</h3>
          <p className="muted">
            Os arquivos de origem são preservados. Uma planilha com linhas
            inválidas ou IDs repetidos não é aplicada; corrija e envie
            novamente.
          </p>
          {!state.history.length ? (
            <p>Nenhum arquivo processado ainda.</p>
          ) : (
            <div className="automation-history">
              {state.history.map((run) => (
                <article className="import-run" key={run.digest}>
                  <div className="import-run-heading">
                    <b>{run.filename}</b>
                    <span
                      className={
                        "badge " +
                        (run.status === "processed" ? "stage-4" : "stage-3")
                      }
                    >
                      {run.status === "processed"
                        ? "Concluído"
                        : "Requer correção"}
                    </span>
                  </div>
                  <small>
                    {new Date(
                      run.created_at.replace(" ", "T") + "Z",
                    ).toLocaleString("pt-BR")}
                  </small>
                  {run.result.error ? (
                    <p className="error">{run.result.error}</p>
                  ) : (
                    <>
                      <p>
                        {run.result.created} novas · {run.result.updated}{" "}
                        atualizadas · {run.result.preserved} preservadas ·{" "}
                        {run.result.protectedFields} campos protegidos
                      </p>
                      {run.result.olderReports > 0 && (
                        <p>
                          Dados de {run.result.olderReports} loja(s) preservados
                          porque já há um arquivo mais recente.
                        </p>
                      )}
                      {run.result.conflicts.length > 0 && (
                        <details>
                          <summary>Ver campos protegidos (até 100)</summary>
                          <ul>
                            {run.result.conflicts.map((c, i) => (
                              <li key={i}>
                                #{c.code}: {LABELS[c.field] || c.field} —{" "}
                                {c.reason}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
