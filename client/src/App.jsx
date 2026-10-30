import React, { useState, useEffect, useRef } from "react";
import { STAGES, PROGRESS, LABELS } from "./constants.js";
import { Field, Stat } from "./components.jsx";
import { Detail } from "./StoreDetail.jsx";
import { Import } from "./ImportPanel.jsx";
import { Users, Config } from "./AdminPanels.jsx";
import { api } from "./api.js";
import { date } from "./dates.js";
import { Brand } from "./Brand.jsx";
import { AutomationPanel } from "./AutomationPanel.jsx";
export default function App() {
  const [user, setUser] = useState(null),
    [setup, setSetup] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [stores, setStores] = useState([]),
    [config, setConfig] = useState([]),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState(""),
    [mode, setMode] = useState("board"),
    [modal, setModal] = useState(null),
    [detail, setDetail] = useState(null),
    [online, setOnline] = useState(false),
    [busy, setBusy] = useState(false),
    [stageSearch, setStageSearch] = useState({});
  const detailRef = useRef(null),
    dirty = useRef(false);
  detailRef.current = detail;
  const canWrite = user && user.role !== "Visualizador";
  function notify(message) {
    setToast(message);
    setTimeout(() => setToast(""), 6000);
  }
  async function load() {
    const [s, c] = await Promise.all([api("/stores"), api("/config")]);
    setStores(s);
    setConfig(c.fields);
    const current = detailRef.current;
    if (
      current &&
      !dirty.current &&
      s.find((x) => x.id === current.id)?.version !== current.version
    )
      setDetail(await api("/stores/" + current.id));
  }
  useEffect(() => {
    Promise.all([api("/setup"), api("/me").catch(() => null)])
      .then(([s, u]) => {
        setSetup(s.required);
        setUser(u);
        setReady(true);
      })
      .catch((e) => {
        setError(e.message);
        setReady(true);
      });
  }, []);
  useEffect(() => {
    if (!user) return;
    load().catch((e) => setError(e.message));
    const events = new EventSource("/api/events");
    events.addEventListener("connected", () => {
      setOnline(true);
      load().catch((e) => setError(e.message));
    });
    events.addEventListener("changed", () => {
      load().catch((e) => setError(e.message));
      setToast("Painel atualizado com as últimas alterações.");
      setTimeout(() => setToast(""), 4000);
    });
    events.onerror = () => setOnline(false);
    return () => events.close();
  }, [user]);
  async function act(fn) {
    setBusy(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function openStore(id) {
    await act(async () => {
      dirty.current = false;
      setDetail(await api("/stores/" + id));
      setModal("detail");
    });
  }
  async function advance(s, stage) {
    await act(async () => {
      await api("/stores/" + s.id, {
        method: "PATCH",
        body: { stage, version: s.version },
      });
      await load();
      notify("Etapa atualizada.");
    });
  }
  const filtered = stores.filter(
    (s) =>
      (filter === "" || s.stage === Number(filter)) &&
      [s.code, s.name, s.owner, s.city].some((v) =>
        v.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
      ),
  );
  if (!ready) return <div className="loading">Carregando Processos…</div>;
  if (!user)
    return (
      <div className="login">
        <Brand className="login-watermark" decorative />
        <div className="login-brand">
          <Brand className="login-side-watermark" decorative />
          <Brand />
          <span>OPERAÇÃO EM MOVIMENTO</span>
          <h1>
            Cada etapa,
            <br />
            um novo avanço.
          </h1>
          <p>
            Uma visão clara de toda a operação.
            <br />
            Da primeira conexão à próxima conquista.
          </p>
          <div className="login-steps">
            01 ━━━ 02 ━━━ 03 <b>↗</b>
          </div>
        </div>
        <div className="login-form">
          <div className="eyebrow">REVO / PROCESSOS</div>
          <h2>{setup ? "Prepare sua operação" : "Bem-vindo de volta"}</h2>
          <p>
            {setup
              ? "Crie o primeiro administrador para começar."
              : "Entre para acompanhar a esteira de lojas."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const body = Object.fromEntries(new FormData(e.currentTarget));
              act(async () => {
                setUser(
                  await api(setup ? "/setup" : "/login", {
                    method: "POST",
                    body,
                  }),
                );
                setSetup(false);
              });
            }}
          >
            {setup && (
              <>
                <Field name="name" label="Seu nome" required />
                <Field
                  name="token"
                  label="Token de configuração do servidor"
                  type="password"
                  required
                />
              </>
            )}
            <Field name="email" label="E-mail" type="email" required />
            <Field
              name="password"
              label="Senha"
              type="password"
              minLength={setup ? 12 : undefined}
              required
            />
            {error && (
              <div role="alert" className="error">
                {error}
              </div>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Aguarde…"
                : setup
                  ? "Criar administrador →"
                  : "Entrar na operação →"}
            </button>
          </form>
          <small>
            Acesso seguro · Permissões por perfil · Histórico de alterações
          </small>
        </div>
      </div>
    );
  return (
    <div className="app">
      <aside>
        <Brand className="sidebar-watermark" decorative />
        <a className="brand" href="/" aria-label="REVO Processos">
          <Brand />
        </a>
        <div className="nav-label">WORKSPACE</div>
        <button className="nav-item active" onClick={() => setModal(null)}>
          <span>▦</span> Esteira de processos <b>↗</b>
        </button>
        <div className="nav-label">OPERAÇÃO</div>
        <button
          className="nav-item"
          onClick={() => {
            setModal("import");
            setError("");
          }}
          disabled={!canWrite}
        >
          <span>⇅</span> Importar planilha
        </button>
        {canWrite && (
          <button className="nav-item" onClick={() => setModal("automation")}>
            <span>↻</span>Importação automática
          </button>
        )}
        <a
          className="nav-item"
          href={
            "/api/export.xlsx?q=" +
            encodeURIComponent(query) +
            "&stage=" +
            filter
          }
        >
          <span>↓</span> Exportar dados
        </a>
        {user.role === "Administrador" && (
          <>
            <div className="nav-label">ADMINISTRAÇÃO</div>
            <button className="nav-item" onClick={() => setModal("users")}>
              <span>♙</span> Equipe e acessos
            </button>
            <button className="nav-item" onClick={() => setModal("config")}>
              <span>⚙</span> Parâmetros das etapas
            </button>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="help-card">
            <b>Seu progresso fica registrado.</b>
            <p>Cada mudança tem autor, data e histórico.</p>
            <span>● Banco de dados persistente</span>
          </div>
          <div className="profile">
            <div className="avatar">{user.name[0]}</div>
            <div>
              <b>{user.name}</b>
              <small>{user.role}</small>
            </div>
            <button title="Minha conta" onClick={() => setModal("account")}>
              ⚙
            </button>
            <button
              title="Sair"
              onClick={() =>
                act(async () => {
                  await api("/logout", { method: "POST" });
                  setUser(null);
                })
              }
            >
              ↪
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <div className="page-watermark" aria-hidden="true">
          <Brand decorative />
        </div>
        <header>
          <span>
            Workspace <span className="slash">/</span> <b>Processos</b>
          </span>
          <span className={"connection " + (online ? "" : "offline")}>
            <i />
            {online ? "Atualização em tempo real" : "Reconectando…"}
          </span>
          <button
            className="mobile-account"
            onClick={() => setModal("account")}
          >
            Minha conta
          </button>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">VISÃO GERAL DA OPERAÇÃO</div>
              <h1>
                Esteira de processos<span>.</span>
              </h1>
              <p>Acompanhe suas lojas. Conecte as etapas. Faça acontecer.</p>
            </div>
            {canWrite && (
              <button
                className="primary"
                onClick={() => {
                  setError("");
                  setModal("new");
                }}
              >
                ＋ Nova loja
              </button>
            )}
          </div>
          <div className="stats">
            <Stat
              label="TOTAL DE LOJAS"
              value={stores.length}
              detail="Toda a sua operação"
              icon="▦"
            />
            <Stat
              label="EM ANDAMENTO"
              value={stores.filter((s) => s.stage > 0 && s.stage < 4).length}
              detail="Da reivindicação à pré-abertura"
              icon="↗"
            />
            <Stat
              label="COOPERANDO"
              value={stores.filter((s) => s.stage === 4).length}
              detail="Lojas em operação"
              icon="✓"
            />
            <Stat
              label="AGUARDANDO INÍCIO"
              value={stores.filter((s) => s.stage === 0).length}
              detail="Prontas para o primeiro passo"
              icon="◷"
            />
          </div>
          <div className="section-heading">
            <div>
              <h2>Fluxo da operação</h2>
              <p>Sete etapas, uma visão completa.</p>
            </div>
            <small>SEQUÊNCIA DE PROCESSOS</small>
          </div>
          <div className="timeline">
            {STAGES.map((s, i) => (
              <button
                key={s}
                className={"step " + (filter === String(i) ? "selected" : "")}
                onClick={() => setFilter(filter === String(i) ? "" : String(i))}
              >
                <span className={"step-circle stage-" + i}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <b>{s}</b>
                <small>
                  {stores.filter((x) => x.stage === i).length} lojas
                </small>
              </button>
            ))}
          </div>
          <div className="board-heading">
            <h2>
              Lojas na esteira <span className="count">{filtered.length}</span>
            </h2>
            <div className="board-actions">
              {canWrite && (
                <button
                  onClick={() => {
                    setModal("import");
                    setError("");
                  }}
                >
                  ⇅ Importar Excel
                </button>
              )}
              <a
                className="button"
                href={
                  "/api/export.xlsx?q=" +
                  encodeURIComponent(query) +
                  "&stage=" +
                  filter
                }
              >
                ↓ Exportar
              </a>
            </div>
          </div>
          <p className="sort-hint">
            ↓ Última alteração primeiro · lojas atualizadas voltam ao início da
            etapa
          </p>
          <div className="toolbar">
            <label className="search">
              <span>⌕</span>
              <input
                aria-label="Buscar lojas"
                placeholder="Buscar por loja, ID, responsável ou cidade…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filtrar etapa"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">Todas as etapas</option>
              {STAGES.map((s, i) => (
                <option key={s} value={i}>
                  {s}
                </option>
              ))}
            </select>
            <div className="view-toggle">
              <button
                className={mode === "board" ? "selected" : ""}
                onClick={() => setMode("board")}
              >
                ▦ Kanban
              </button>
              <button
                className={mode === "list" ? "selected" : ""}
                onClick={() => setMode("list")}
              >
                ☷ Lista
              </button>
            </div>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}
          {stores.length === 0 ? (
            <div className="empty">
              <div>▦</div>
              <h2>Sua próxima conquista começa aqui.</h2>
              <p>
                Cadastre a primeira loja ou importe sua planilha.
                <br />
                Tudo organizado em uma única esteira.
              </p>
              {canWrite && (
                <button className="primary" onClick={() => setModal("import")}>
                  ⇅ Importar primeiras lojas
                </button>
              )}
            </div>
          ) : mode === "board" ? (
            <div className="kanban">
              {STAGES.map(
                (s, i) =>
                  (filter === "" || filter === String(i)) && (
                    <section
                      key={s}
                      className="kanban-column"
                      onDragOver={(e) => canWrite && e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const store = stores.find(
                          (s) =>
                            s.id ===
                            Number(e.dataTransfer.getData("text/plain")),
                        );
                        if (store) advance(store, i);
                      }}
                    >
                      <div className="column-heading">
                        <span className={"dot stage-" + i} />
                        <b>{s}</b>
                        <span className="count">
                          {filtered.filter((s) => s.stage === i).length}
                        </span>
                      </div>
                      <label className="column-search">
                        <input
                          aria-label={"Buscar em " + s}
                          placeholder="Buscar nesta etapa…"
                          value={stageSearch[i] || ""}
                          onChange={(e) =>
                            setStageSearch({
                              ...stageSearch,
                              [i]: e.target.value,
                            })
                          }
                        />
                      </label>
                      <div className="column-body">
                        {filtered
                          .filter(
                            (s) =>
                              s.stage === i &&
                              [s.code, s.name, s.owner, s.city].some((v) =>
                                v
                                  .toLocaleLowerCase("pt-BR")
                                  .includes(
                                    (stageSearch[i] || "").toLocaleLowerCase(
                                      "pt-BR",
                                    ),
                                  ),
                              ),
                          )
                          .map((s) => (
                            <article
                              key={s.id}
                              className="store-card"
                              draggable={canWrite && !busy}
                              onDragStart={(e) =>
                                e.dataTransfer.setData("text/plain", s.id)
                              }
                            >
                              <button
                                className="card-open"
                                onClick={() => openStore(s.id)}
                              >
                                <span className="store-code">
                                  #{s.code} <span>↗</span>
                                </span>
                                <h3>{s.name}</h3>
                                <p>⌖ {s.city || "Cidade não informada"}</p>
                                <div className="progress">
                                  <span
                                    style={{ width: PROGRESS[s.stage] + "%" }}
                                  />
                                </div>
                                <small className="progress-label">
                                  {PROGRESS[s.stage]}% do processo
                                </small>
                                <small className="updated-label">
                                  Atualizada em {date(s.updated_at)}
                                </small>
                                <div className="card-footer">
                                  <span className="mini-avatar">
                                    {s.owner ? s.owner[0] : "–"}
                                  </span>
                                  <span>{s.owner || "Sem responsável"}</span>
                                </div>
                              </button>
                            </article>
                          ))}
                        {!filtered.some(
                          (s) =>
                            s.stage === i &&
                            [s.code, s.name, s.owner, s.city].some((v) =>
                              v
                                .toLocaleLowerCase("pt-BR")
                                .includes(
                                  (stageSearch[i] || "").toLocaleLowerCase(
                                    "pt-BR",
                                  ),
                                ),
                            ),
                        ) && (
                          <div className="column-empty">
                            Nenhuma loja nesta etapa
                          </div>
                        )}
                      </div>
                    </section>
                  ),
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Loja / Merchant ID</th>
                    <th>Responsável</th>
                    <th>Cidade</th>
                    <th>Etapa</th>
                    <th>Progresso</th>
                    <th>Atualização</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => openStore(s.id)}
                        >
                          {s.name}
                        </button>
                        <small>#{s.code}</small>
                      </td>
                      <td>{s.owner || "—"}</td>
                      <td>{s.city || "—"}</td>
                      <td>
                        <span className={"badge stage-" + s.stage}>
                          {STAGES[s.stage]}
                        </span>
                      </td>
                      <td>{PROGRESS[s.stage]}%</td>
                      <td>{date(s.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="empty">
                  Nenhuma loja encontrada com esses filtros.
                </p>
              )}
            </div>
          )}
          <footer>
            REVO PROCESSOS{" "}
            <span>Clareza para acompanhar. Controle para evoluir.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          ✓ {toast}
        </div>
      )}
      {modal && (
        <div
          className="overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            onChange={() => {
              if (modal === "detail") dirty.current = true;
            }}
            aria-label={
              modal === "detail"
                ? "Detalhes da loja"
                : "Configuração de processos"
            }
            className={
              "modal " +
              (["detail", "import", "automation"].includes(modal) ? "wide" : "")
            }
          >
            <div className="modal-heading">
              <div className="eyebrow">REVO / PROCESSOS</div>
              <button aria-label="Fechar" onClick={() => setModal(null)}>
                ×
              </button>
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {modal === "new" && (
              <>
                <h2>Uma nova loja na esteira</h2>
                <p>O Merchant ID é único e não poderá ser alterado.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const body = Object.fromEntries(
                      new FormData(e.currentTarget),
                    );
                    act(async () => {
                      await api("/stores", { method: "POST", body });
                      await load();
                      setModal(null);
                      notify("Loja cadastrada.");
                    });
                  }}
                >
                  <div className="form-grid">
                    {Object.entries(LABELS).map(([key, label]) => (
                      <Field
                        key={key}
                        name={key}
                        label={label}
                        required={["code", "name"].includes(key)}
                      />
                    ))}
                  </div>
                  <button className="primary" disabled={busy}>
                    Cadastrar loja
                  </button>
                </form>
              </>
            )}
            {modal === "detail" &&
              detail &&
              stores.find((s) => s.id === detail.id)?.version !==
                detail.version && (
                <div className="info">
                  Esta loja recebeu novas alterações. Seus campos em edição
                  foram preservados. Use Recarregar antes de salvar.
                </div>
              )}
            {modal === "detail" && detail && (
              <Detail
                key={detail.id + ":" + detail.version}
                detail={detail}
                config={config}
                canWrite={canWrite}
                busy={busy}
                save={(body) =>
                  act(async () => {
                    await api("/stores/" + detail.id, {
                      method: "PATCH",
                      body: { ...body, version: detail.version },
                    });
                    dirty.current = false;
                    setDetail(await api("/stores/" + detail.id));
                    await load();
                    notify("Alterações salvas.");
                  })
                }
                reload={() =>
                  act(async () => {
                    dirty.current = false;
                    setDetail(await api("/stores/" + detail.id));
                  })
                }
                note={(body) =>
                  act(async () => {
                    await api("/stores/" + detail.id + "/notes", {
                      method: "POST",
                      body: { body },
                    });
                    setDetail(await api("/stores/" + detail.id));
                    notify("Nota adicionada.");
                    return true;
                  })
                }
              />
            )}
            {modal === "import" && (
              <Import
                canWrite={canWrite}
                busy={busy}
                act={act}
                done={async (result) => {
                  await load();
                  setModal(null);
                  notify(
                    `${result.created} criadas · ${result.updated} atualizadas · ${result.skipped} preservadas · ${result.invalid} linhas inválidas/repetidas`,
                  );
                }}
              />
            )}
            {modal === "automation" && (
              <AutomationPanel isAdmin={user.role === "Administrador"} />
            )}
            {modal === "users" && <Users user={user} act={act} busy={busy} />}
            {modal === "account" && (
              <>
                <h2>Minha conta</h2>
                <p>
                  {user.name} · {user.role}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const body = Object.fromEntries(new FormData(form));
                    act(async () => {
                      await api("/password", { method: "POST", body });
                      form.reset();
                      notify("Senha alterada.");
                    });
                  }}
                >
                  <Field
                    name="current"
                    label="Senha atual"
                    type="password"
                    required
                  />
                  <Field
                    name="password"
                    label="Nova senha"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                  <button className="primary" disabled={busy}>
                    Alterar senha
                  </button>
                </form>
                <button
                  className="logout-button"
                  onClick={() =>
                    act(async () => {
                      await api("/logout", { method: "POST" });
                      setModal(null);
                      setUser(null);
                    })
                  }
                >
                  Sair da conta
                </button>
              </>
            )}
            {modal === "config" && (
              <Config
                fields={config}
                busy={busy}
                save={(stage, body) =>
                  act(async () => {
                    await api("/config/" + stage, { method: "PUT", body });
                    await load();
                    notify("Parâmetros atualizados.");
                  })
                }
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
