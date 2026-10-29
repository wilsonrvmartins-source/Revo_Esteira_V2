import React, { useState, useEffect } from "react";
import { STAGES } from "./constants.js";
import { Field } from "./components.jsx";
import { api } from "./api.js";
export function Users({ user, act, busy }) {
  const [users, setUsers] = useState([]);
  const load = () => api("/users").then(setUsers);
  useEffect(() => {
    act(load);
  }, []);
  return (
    <>
      <h2>Equipe e acessos</h2>
      <p>Perfis aplicados no servidor, inclusive para importações.</p>
      {users.map((u) => (
        <div className="user-row" key={u.id}>
          <div>
            <b>{u.name}</b>
            <small>{u.email}</small>
          </div>
          {u.id === user.id ? (
            <span>Administrador · você</span>
          ) : (
            <>
              <select
                aria-label={"Perfil de " + u.name}
                value={u.role}
                disabled={busy}
                onChange={(e) =>
                  act(async () => {
                    await api("/users/" + u.id, {
                      method: "PATCH",
                      body: { role: e.target.value, active: !!u.active },
                    });
                    await load();
                  })
                }
              >
                {["Administrador", "Operador", "Visualizador"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <button
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await api("/users/" + u.id, {
                      method: "PATCH",
                      body: { role: u.role, active: !u.active },
                    });
                    await load();
                  })
                }
              >
                {u.active ? "Desativar" : "Ativar"}
              </button>
              <details>
                <summary>Redefinir senha</summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = e.currentTarget,
                      password = new FormData(f).get("password");
                    act(async () => {
                      await api("/users/" + u.id, {
                        method: "PATCH",
                        body: { role: u.role, active: !!u.active, password },
                      });
                      f.reset();
                    });
                  }}
                >
                  <Field
                    name="password"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    label="Nova senha"
                    required
                  />
                  <button disabled={busy}>Redefinir</button>
                </form>
              </details>
            </>
          )}
        </div>
      ))}
      <h3>Adicionar pessoa</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = e.currentTarget,
            body = Object.fromEntries(new FormData(f));
          act(async () => {
            await api("/users", { method: "POST", body });
            await load();
            f.reset();
          });
        }}
      >
        <div className="form-grid">
          <Field name="name" label="Nome" required />
          <Field name="email" label="E-mail" type="email" required />
          <Field
            name="password"
            label="Senha inicial (mínimo 12 caracteres)"
            type="password"
            minLength={12}
            maxLength={128}
            required
          />
          <label className="field">
            <span>Perfil</span>
            <select name="role">
              <option>Visualizador</option>
              <option>Operador</option>
              <option>Administrador</option>
            </select>
          </label>
        </div>
        <button className="primary" disabled={busy}>
          Criar acesso
        </button>
      </form>
    </>
  );
}
export function Config({ fields, busy, save }) {
  return (
    <>
      <h2>Parâmetros das etapas</h2>
      <p>
        Defina orientações comuns para toda a equipe, sem alterar a sequência.
      </p>
      {fields.map((f) => (
        <form
          className="config-form"
          key={f.stage}
          onSubmit={(e) => {
            e.preventDefault();
            save(f.stage, Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <h3>
            {f.stage + 1}. {STAGES[f.stage]}
          </h3>
          <Field
            name="label"
            label="Nome do parâmetro"
            defaultValue={f.label}
            maxLength={100}
            required
          />
          <label className="field">
            <span>Orientação para a equipe</span>
            <textarea
              name="instructions"
              maxLength={3000}
              defaultValue={f.instructions}
            />
          </label>
          <button disabled={busy}>Salvar etapa</button>
        </form>
      ))}
    </>
  );
}
