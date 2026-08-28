import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  AdministrationError,
  assignUserRole,
  createRole,
  createUser,
  deleteRole,
  deleteUser,
  getMenus,
  getRoles,
  getUsers,
  updateRole,
  updateUser,
  suspendUser,
  blockUser,
  unblockUser,
} from "../../api/administration.js";
import { logger } from "../../utils/logger.js";

const EMPTY_ROLE = { nameRole: "", description: "", menuIds: [] };
const EMPTY_USER = {
  username: "",
  password: "",
  passwordConfirmation: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roleId: "",
  enabled: true,
};

function normalizeRoleForm(role) {
  return {
    ...EMPTY_ROLE,
    ...(role ?? {}),
    nameRole: role?.nameRole ?? "",
    description: role?.description ?? "",
    menuIds: Array.isArray(role?.menuIds)
      ? role.menuIds
      : (role?.menuItems ?? []).map((menu) => menu.idMenu),
  };
}

function normalizeUserForm(user) {
  return {
    ...EMPTY_USER,
    ...(user ?? {}),
    username: user?.username ?? "",
    password: "",
    passwordConfirmation: "",
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    roleId: user?.roleId ?? "",
    enabled: user?.enabled ?? true,
  };
}

function normalizeUserState(user) {
  if (user?.status === "BLOQUE") {
    return { ...user, accountLocked: true, lockedAt: null, lockedUntil: null };
  }
  if (user?.status === "SUSPENDU") {
    return { ...user, accountLocked: true, lockedAt: user.lockedAt ?? true };
  }
  if (user?.status === "ACTIF" || user?.status === "DESACTIVE") {
    return { ...user, accountLocked: false };
  }
  return user;
}

function getUserStatus(user) {
  if (user?.status === "BLOQUE" || (user?.accountLocked && !user?.lockedAt)) return "BLOQUE";
  if (user?.status === "SUSPENDU" || user?.accountLocked) return "SUSPENDU";
  return user?.enabled === false ? "DESACTIVE" : "ACTIF";
}

function dataList(value) {
  if (Array.isArray(value)) return value;
  return value?.content ?? value?.items ?? value?.data ?? [];
}
function icon(name) {
  const paths = {
    edit: (
      <>
        <path d="m4 16 10-10 4 4L8 20H4v-4Z" />
        <path d="m13 7 4 4" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 14h10l1-14M9 7V4h6v3" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    activate: (
      <>
        <path d="M12 3v9" />
        <path d="M7.05 5.05a7 7 0 1 0 9.9 0" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
  };
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
function Field({ label, required, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">
      <span>
        {label}
        {required && <b className="ml-1 text-rose-500">*</b>}
      </span>
      {children}
    </label>
  );
}
function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 ${className}`}
    />
  );
}
function Status({ message, type = "success" }) {
  return (
    message && (
      <div
        role="status"
        className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
      >
        {message}
      </div>
    )
  );
}
function TableActions({ onEdit, onDelete }) {
  return (
    <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
      <button
        title="Modifier"
        type="button"
        onClick={onEdit}
        className="rounded-lg p-2 text-teal-700 hover:bg-teal-50"
      >
        {icon("edit")}
      </button>
      <button
        title="Supprimer"
        type="button"
        onClick={onDelete}
        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
      >
        {icon("trash")}
      </button>
    </div>
  );
}
function UserActions({ user, onEdit, onDelete, onSuspend, onToggleBlock }) {
  const suspended = user.accountLocked && user.lockedAt && user.lockedUntil;
  const blocked = user.accountLocked && !suspended;
  return (
    <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
      <button
        title="Modifier"
        type="button"
        onClick={onEdit}
        className="rounded-lg p-2 text-teal-700 hover:bg-teal-50"
      >
        {icon("edit")}
      </button>
      <button
        title="Supprimer"
        type="button"
        onClick={onDelete}
        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
      >
        {icon("trash")}
      </button>
      {!user.accountLocked && <button title="Suspendre" type="button" onClick={onSuspend} className="rounded-lg p-2 text-amber-700 hover:bg-amber-50">{icon("clock")}</button>}
      {!user.accountLocked && <button title="Bloquer" type="button" onClick={onToggleBlock} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100">{icon("lock")}</button>}
      {user.accountLocked && <button title="Activer le compte" type="button" onClick={onToggleBlock} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50">{icon("activate")}</button>}
    </div>
  );
}

function useTable(items, search, fields) {
  const [sort, setSort] = useState({ key: fields[0], direction: "asc" });
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      items
        .filter((item) =>
          fields.some((field) =>
            String(field(item) ?? "")
              .toLowerCase()
              .includes(search.toLowerCase()),
          ),
        )
        .sort((a, b) => {
          const result = String(sort.key(a) ?? "").localeCompare(
            String(sort.key(b) ?? ""),
            "fr",
            { numeric: true },
          );
          return sort.direction === "asc" ? result : -result;
        }),
    [items, search, fields, sort],
  );
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const toggle = (key) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  useEffect(() => setPage(1), [search]);
  return { visible, filtered, page, pages, setPage, toggle };
}
function SortHead({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      {children} <span className="ml-1 text-slate-300">↕</span>
    </button>
  );
}
function Pager({ table }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs font-semibold text-slate-500">
      <span>
        {table.filtered.length} résultat{table.filtered.length > 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-2">
        <Button
          disabled={table.page === 1}
          onClick={() => table.setPage((p) => p - 1)}
          className="border border-slate-200 bg-white px-3 py-1.5 text-slate-600"
        >
          Précédent
        </Button>
        <span>
          Page {table.page} / {table.pages}
        </span>
        <Button
          disabled={table.page === table.pages}
          onClick={() => table.setPage((p) => p + 1)}
          className="border border-slate-200 bg-white px-3 py-1.5 text-slate-600"
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}

function TreeCheckbox({ checked, indeterminate, onChange, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-white p-3 text-sm font-semibold text-slate-700 shadow-sm">
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-teal-600" />
      {children}
    </label>
  );
}

function RoleDrawer({ role, menus, saving, formError, onClose, onSave }) {
  const [form, setForm] = useState(() => normalizeRoleForm(role));
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-teal-600">
              Administration
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {role ? "Modifier le rôle" : "Ajouter un rôle"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Fermer"
          >
            {icon("close")}
          </button>
        </div>
        <Status message={formError} type="error" />
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
        >
          <Field label="Nom du rôle" required>
            <Input
              required
              value={form.nameRole}
              onChange={(e) => set("nameRole", e.target.value)}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="min-h-24 rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
            />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-slate-700">
              Menus associés
            </legend>
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {menus.length ? (
                menus.map((section) => {
                  const children = section.sousMenus ?? [];
                  const selected = children.filter((menu) => form.menuIds.some((id) => String(id) === String(menu.idMenu)));
                  const allSelected = children.length > 0 && selected.length === children.length;
                  const toggleSection = (checked) => set("menuIds", checked
                    ? [...new Set([...form.menuIds, ...children.map((menu) => menu.idMenu)])]
                    : form.menuIds.filter((id) => !children.some((menu) => String(menu.idMenu) === String(id))));
                  return (
                    <div key={section.idMenuPrinc} className="rounded-lg border border-slate-200 bg-white p-2">
                      <TreeCheckbox checked={allSelected} indeterminate={selected.length > 0 && !allSelected} onChange={(e) => toggleSection(e.target.checked)}>
                        {section.nom}
                      </TreeCheckbox>
                      <div className="ml-7 grid gap-1 border-l border-slate-200 pl-3 pt-1">
                        {children.map((menu) => (
                          <label key={menu.idMenu} className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-slate-600">
                            <input type="checkbox" checked={form.menuIds.some((id) => String(id) === String(menu.idMenu))} onChange={(e) => set("menuIds", e.target.checked ? [...form.menuIds, menu.idMenu] : form.menuIds.filter((id) => String(id) !== String(menu.idMenu)))} className="h-4 w-4 accent-teal-600" />
                            {menu.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="p-2 text-sm text-slate-500">
                  Aucun menu disponible.
                </p>
              )}
            </div>
          </fieldset>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              onClick={onClose}
              className="border border-slate-200 bg-white text-slate-700"
            >
              Annuler
            </Button>
            <Button
              disabled={saving}
              className="bg-teal-700 text-white hover:bg-teal-800"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function UserDrawer({ user, roles, menus, saving, formError, onClose, onSave }) {
  const [form, setForm] = useState(() => normalizeUserForm(user));
  const { token } = useAuth();
  const [stateSaving, setStateSaving] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const applyState = async (action, minutes) => {
    setStateSaving(true);
    if (action === "suspend") await suspendUser(token, user.id, minutes);
    if (action === "block") await blockUser(token, user.id);
    if (action === "unblock") await unblockUser(token, user.id);
    window.location.reload();
  };
  const locked = user?.accountLocked;
  const selectedRole = roles.find((role) => String(role.idRole) === String(form.roleId));
  const accessibleMenus = selectedRole?.menuItems ?? [];
  const accessibleMenuIds = new Set(accessibleMenus.map((menu) => String(menu.idMenu ?? menu.id)));
  const accessibleSections = menus
    .map((section) => ({
      ...section,
      sousMenus: (section.sousMenus ?? []).filter((menu) => accessibleMenuIds.has(String(menu.idMenu ?? menu.id))),
    }))
    .filter((section) => section.sousMenus.length > 0);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-teal-600">
              Administration
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {user ? "Modifier l’utilisateur" : "Ajouter un utilisateur"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Fermer"
          >
            {icon("close")}
          </button>
        </div>
        <Status message={formError} type="error" />
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
        >
          <Field label="Nom d’utilisateur" required>
            <Input
              required
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
            />
          </Field>
          <Field label="Rôle" required>
            <select
              required
              value={form.roleId}
              onChange={(e) => set("roleId", e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Sélectionner</option>
              {roles.map((role) => (
                <option key={role.idRole} value={role.idRole}>
                  {role.nameRole}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mot de passe" required={!user}>
            <Input
              type="password"
              required={!user}
              minLength="6"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={user ? "Laisser vide pour conserver" : ""}
            />
          </Field>
          <Field label="Confirmation" required={!user}>
            <Input
              type="password"
              required={!user}
              minLength="6"
              value={form.passwordConfirmation}
              onChange={(e) => set("passwordConfirmation", e.target.value)}
            />
          </Field>
          <Field label="Prénom" required>
            <Input
              required
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </Field>
          <Field label="Nom" required>
            <Input
              required
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </Field>
          <Field label="Email" required>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label="Téléphone">
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => set("enabled", e.target.checked)}
              className="h-4 w-4 accent-teal-600"
            />
            Compte activé
          </label>
          {user?.id && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
              <h3 className="text-sm font-black text-slate-800">Menus accessibles</h3>
              {accessibleSections.length ? (
                <div className="mt-3 grid gap-2">
                  {accessibleSections.map((section) => (
                    <div key={section.idMenuPrinc} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-bold text-slate-800">{section.nom}</p>
                      <div className="mt-2 flex flex-wrap gap-2 border-l-2 border-teal-100 pl-3">
                        {section.sousMenus.map((menu) => (
                          <span key={menu.idMenu ?? menu.id} className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700">
                            {menu.label ?? menu.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs font-semibold text-slate-500">Aucun menu associé à ce rôle.</p>
              )}
            </section>
          )}
          {user?.id && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5 sm:col-span-2">
              <Button
                type="button"
                onClick={() => setSuspendOpen(true)}
                className="bg-amber-50 text-amber-700"
              >
                Suspendre
              </Button>
              <Button
                type="button"
                disabled={stateSaving}
                onClick={() => applyState(locked ? "unblock" : "block")}
                className="bg-slate-100 text-slate-700"
              >
                {locked ? "Activer" : "Bloquer"}
              </Button>
            </div>
          )}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 sm:col-span-2">
            <Button
              type="button"
              onClick={onClose}
              className="border border-slate-200 bg-white text-slate-700"
            >
              Annuler
            </Button>
            <Button
              disabled={saving}
              className="bg-teal-700 text-white hover:bg-teal-800"
            >
              {saving ? "Enregistrement..." : user ? "Modifier" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </section>
      {suspendOpen && (
        <SuspendDialog
          user={user}
          saving={stateSaving}
          onClose={() => setSuspendOpen(false)}
          onConfirm={(minutes) => applyState("suspend", minutes)}
        />
      )}
    </div>
  );
}

function SuspendDialog({ user, saving, onClose, onConfirm }) {
  const [minutes, setMinutes] = useState("30");
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-black text-slate-900">
          Suspendre {user.username}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Choisissez la durée de suspension du compte.
        </p>
        <Field label="Durée" required>
          <select
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 heure</option>
            <option value="240">4 heures</option>
            <option value="1440">24 heures</option>
          </select>
        </Field>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            onClick={onClose}
            className="border border-slate-200 bg-white text-slate-700"
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => onConfirm(Number(minutes))}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {saving ? "Application..." : "Suspendre"}
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function AdministrationPage({ mode = "roles" }) {
  const { token, username: currentUsername } = useAuth();
  const isRoles = mode === "roles";
  const [items, setItems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      if (isRoles) {
        const [loadedRoles, loadedMenus] = await Promise.all([
          getRoles(token),
          getMenus(token),
        ]);
        setRoles(dataList(loadedRoles));
        setMenus(dataList(loadedMenus));
        setItems(dataList(loadedRoles));
      } else {
        const [loadedUsers, loadedRoles, loadedMenus] = await Promise.all([
          getUsers(token),
          getRoles(token),
          getMenus(token),
        ]);
        setRoles(dataList(loadedRoles));
        setMenus(dataList(loadedMenus));
        setItems(
          dataList(loadedUsers)
            .filter(
              (user) =>
                !currentUsername ||
                user.username?.toLowerCase() !== currentUsername.toLowerCase(),
            )
            .map(normalizeUserState),
        );
      }
    } catch (err) {
      logger.warn("Échec enregistrement administration", {
        mode: isRoles ? "role" : "user",
        status: err.status,
        code: err.code,
        message: err.message,
      });
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (token) load();
  }, [token, isRoles, currentUsername]);
  useEffect(() => {
    if (editing) setError("");
  }, [editing]);
  const roleFields = [(r) => r.nameRole, (r) => r.description];
  const userFields = [
    (u) => u.username,
    (u) => u.firstName,
    (u) => u.lastName,
    (u) => u.email,
    (u) => u.phone,
    (u) => u.roles?.nameRole,
  ];
  const table = useTable(items, search, isRoles ? roleFields : userFields);
  const save = async (form) => {
    setSaving(true);
    setError("");
    try {
      if (isRoles) {
        const body = {
          nameRole: form.nameRole.trim(),
          description: form.description.trim(),
          menuIds: form.menuIds,
        };
        editing?.idRole
          ? await updateRole(token, editing.idRole, body)
          : await createRole(token, body);
      } else {
        if (form.password !== form.passwordConfirmation)
          throw new AdministrationError(
            "Les deux mots de passe doivent être identiques.",
          );
        const body = {
          username: form.username.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          enabled: form.enabled,
        };
        if (form.password) body.password = form.password;
        const result = editing?.id
          ? await updateUser(token, editing.id, body)
          : await createUser(token, body);
        const id = editing?.id ?? result?.id;
        if (form.roleId && id) await assignUserRole(token, id, form.roleId);
      }
      setEditing(null);
      setNotice(isRoles ? "Rôle enregistré." : "Utilisateur enregistré.");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const remove = async (item) => {
    const label = isRoles ? item.nameRole : item.username;
    const warning = isRoles
      ? `Le rôle « ${label} » peut être utilisé par des utilisateurs. Confirmer la suppression ?`
      : `Supprimer l’utilisateur « ${label} » ?`;
    if (!window.confirm(warning)) return;
    try {
      setError("");
      if (isRoles) await deleteRole(token, item.idRole);
      else await deleteUser(token, item.id);
      setNotice("Suppression effectuée.");
      await load();
    } catch (err) {
      setError(
        err.status === 409
          ? "Impossible de supprimer ce rôle : il est encore utilisé par des utilisateurs."
          : errorMessage(err),
      );
    }
  };
  const changeUserState = async (action, user, minutes = null) => {
    try {
      setSaving(true);
      setError("");
      if (action === "suspend") await suspendUser(token, user.id, minutes);
      if (action === "block") await blockUser(token, user.id);
      if (action === "unblock") await unblockUser(token, user.id);
      setSuspendTarget(null);
      setNotice(
        action === "suspend"
          ? "Compte suspendu."
          : action === "block"
            ? "Compte bloqué."
            : "Compte débloqué.",
      );
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const title = isRoles ? "Rôles" : "Users";
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-teal-700">
            Administration
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isRoles
              ? "Organisez les accès par rôle et par menu."
              : "Gérez les comptes et leurs accès à la plateforme."}
          </p>
        </div>
        <Button
          onClick={() =>
            setEditing(isRoles ? { ...EMPTY_ROLE } : { ...EMPTY_USER })
          }
          className="bg-teal-700 text-white shadow-lg shadow-teal-700/20 hover:bg-teal-800"
        >
          {icon("plus")}
          {isRoles ? "Ajouter un rôle" : "Ajouter un utilisateur"}
        </Button>
      </div>
      <Status message={notice} />
      {!editing && <Status message={error} type="error" />}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-black text-slate-900">
            {isRoles ? "Répertoire des rôles" : "Répertoire des utilisateurs"}
          </h2>
          <label className="relative flex items-center">
            <span className="absolute left-3 text-slate-400">
              {icon("search")}
            </span>
            <Input
              aria-label="Rechercher"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 sm:w-72"
            />
          </label>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-500">
            Chargement des données...
          </div>
        ) : !table.filtered.length ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-500">
            Aucune donnée à afficher.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    {isRoles ? (
                      <>
                        <th className="px-5 py-4">
                          <SortHead onClick={() => table.toggle(roleFields[0])}>
                            Nom du rôle
                          </SortHead>
                        </th>
                        <th className="px-5 py-4">Description</th>
                        <th className="px-5 py-4">Menus</th>
                      </>
                    ) : (
                      <>
                        <th className="px-5 py-4">
                          <SortHead onClick={() => table.toggle(userFields[0])}>
                            Utilisateur
                          </SortHead>
                        </th>
                        <th className="px-5 py-4">Identité</th>
                        <th className="px-5 py-4">Email</th>
                        <th className="px-5 py-4">Téléphone</th>
                        <th className="px-5 py-4">Rôle</th>
                        <th className="px-5 py-4">Statut</th>
                      </>
                    )}
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.visible.map((item) =>
                    isRoles ? (
                      <tr
                        key={item.idRole}
                        className="cursor-pointer hover:bg-teal-50/30"
                        onClick={() =>
                          setEditing({
                            ...item,
                            menuIds: (item.menuItems ?? []).map(
                              (menu) => menu.idMenu ?? menu.id,
                            ),
                          })
                        }
                      >
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {item.nameRole}
                        </td>
                        <td className="max-w-xs px-5 py-4 text-slate-500">
                          {item.description || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                            {item.menuItems?.length ?? 0} menu
                            {item.menuItems?.length === 1 ? "" : "s"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <TableActions
                            onEdit={() =>
                              setEditing({
                                ...item,
                                menuIds: (item.menuItems ?? []).map(
                                  (m) => m.idMenu ?? m.id,
                                ),
                              })
                            }
                            onDelete={() => remove(item)}
                          />
                        </td>
                      </tr>
                    ) : (
                      <tr key={item.id} className="cursor-pointer hover:bg-teal-50/30" onClick={() => setEditing({ ...item, roleId: item.roles?.idRole ?? "" })}>
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {item.username}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {item.firstName} {item.lastName}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {item.email}
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {item.phone || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-teal-700">
                            {item.roles?.nameRole || "Sans rôle"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getUserStatus(item) === "ACTIF" ? "bg-emerald-50 text-emerald-700" : getUserStatus(item) === "SUSPENDU" ? "bg-amber-50 text-amber-700" : getUserStatus(item) === "BLOQUE" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
                            {getUserStatus(item) === "ACTIF" ? "Activé" : getUserStatus(item) === "SUSPENDU" ? `Suspendu${item.lockedUntil ? ` (${item.lockedUntil} min)` : ""}` : getUserStatus(item) === "BLOQUE" ? "Bloqué" : "Désactivé"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <UserActions
                            user={item}
                            onEdit={() =>
                              setEditing({
                                ...item,
                                roleId: item.roles?.idRole ?? "",
                              })
                            }
                            onDelete={() => remove(item)}
                            onSuspend={() => setSuspendTarget(item)}
                            onToggleBlock={() => changeUserState(item.accountLocked ? "unblock" : "block", item)}
                          />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <Pager table={table} />
          </>
        )}
      </div>
      {editing &&
        (isRoles ? (
          <RoleDrawer
            role={editing.idRole ? editing : null}
            menus={menus}
            saving={saving}
            formError={error}
            onClose={() => setEditing(null)}
            onSave={save}
          />
        ) : (
          <UserDrawer
            user={editing.id ? editing : null}
            roles={roles}
            menus={menus}
            saving={saving}
            formError={error}
            onClose={() => setEditing(null)}
            onSave={save}
          />
        ))}
      {suspendTarget && (
        <SuspendDialog
          user={suspendTarget}
          saving={saving}
          onClose={() => setSuspendTarget(null)}
          onConfirm={(minutes) => changeUserState("suspend", suspendTarget, minutes)}
        />
      )}
    </div>
  );
}

function errorMessage(error) {
  if (!(error instanceof AdministrationError))
    return error?.message || "Une erreur est survenue.";
  if (error.status === 401)
    return "Votre session a expiré. Veuillez vous reconnecter.";
  if (error.status === 403) return "Vous n’avez pas les droits nécessaires.";
  if (error.status >= 500)
    return "Le serveur rencontre un problème. Réessayez plus tard.";
  if (error.status === 404 || error.status === 405)
    return "Endpoint backend manquant ou indisponible pour cette opération.";
  return error.message || "Requête invalide.";
}
