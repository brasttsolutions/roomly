"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import {
  createAdminResource,
  updateAdminResource,
  type AdminActionState,
} from "@/app/admin/actions";
import type { AdminRecord, AdminResource } from "@/lib/admin-sections";

type Option = { id: string; name: string };

export function AdminCreateDialog(props: {
  section: AdminResource | "clientes";
  label: string;
  locations: Option[];
  rooms: Option[];
}) {
  return <AdminResourceDialog {...props} />;
}

/** Abre o mesmo formulário com os valores atuais e envia para a ação de edição. */
export function AdminEditDialog({
  section,
  record,
  label,
  locations,
  rooms,
}: {
  section: AdminResource;
  record: AdminRecord;
  label: string;
  locations: Option[];
  rooms: Option[];
}) {
  return (
    <AdminResourceDialog
      section={section}
      record={record}
      label={label}
      locations={locations}
      rooms={rooms}
    />
  );
}

function AdminResourceDialog({
  section,
  label,
  locations,
  rooms,
  record,
}: {
  section: AdminResource | "clientes";
  label: string;
  locations: Option[];
  rooms: Option[];
  record?: AdminRecord;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const editing = Boolean(record);
  // Uma linha da tabela abre o seu próprio diálogo, então o formulário só é
  // montado quando ele abre: sem isso a página carregaria um formulário
  // completo, com rótulos repetidos, para cada registro listado.
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    editing ? updateAdminResource : createAdminResource,
    { ok: false },
  );
  const close = () => dialog.current?.close();
  const show = () => {
    setOpen(true);
    dialog.current?.showModal();
  };
  useEffect(() => {
    if (state.ok && section !== "clientes") dialog.current?.close();
  }, [section, state]);
  return (
    <>
      {editing ? (
        <button
          onClick={show}
          aria-label={`Editar ${record?.name ?? ""}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#cfd6d1] bg-white px-3 text-sm font-semibold hover:bg-[#f0f2ef]"
        >
          <Pencil size={15} />
          Editar
        </button>
      ) : (
        <button
          onClick={show}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#176b4d] px-4 text-sm font-bold text-white"
        >
          <Plus size={17} />
          {label}
        </button>
      )}
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        className="m-auto w-[min(92vw,520px)] rounded-lg border border-[#d9ded9] bg-white p-0 backdrop:bg-black/35"
      >
        {open && (
          <form action={action} className="p-6">
            <input type="hidden" name="resource" value={section} />
            {record?.id && <input type="hidden" name="id" value={record.id} />}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editing ? `Editar ${record?.name ?? ""}` : label}
              </h2>
              <button
                type="button"
                title="Fechar"
                onClick={close}
                className="grid size-9 place-items-center rounded-md hover:bg-[#eef1ed]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              {section === "unidades" && <UnitFields record={record} />}
              {section === "salas" && (
                <RoomFields locations={locations} record={record} />
              )}
              {section === "fechaduras" && (
                <LockFields rooms={rooms} record={record} />
              )}
              {section === "clientes" && <InvitationFields />}
            </div>
            {state.error && (
              <p role="alert" className="mt-4 text-sm text-[#a84331]">
                {state.error}
              </p>
            )}
            {state.ok && state.message && section === "clientes" && (
              <p className="mt-4 break-all rounded-md bg-[#e4f3eb] p-3 text-sm text-[#176b4d]">
                {state.message}
              </p>
            )}
            <button
              disabled={pending}
              className="mt-6 h-11 w-full rounded-md bg-[#176b4d] text-sm font-bold text-white disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-md border border-[#cfd6d1] px-3 font-normal"
      />
    </label>
  );
}
function UnitFields({ record }: { record?: AdminRecord }) {
  return (
    <>
      <Field label="Nome" name="name" defaultValue={record?.name} />
      <Field label="Endereço" name="address" defaultValue={record?.address} />
      <div className="grid grid-cols-[1fr_90px] gap-3">
        <Field label="Cidade" name="city" defaultValue={record?.city} />
        <Field label="UF" name="state" defaultValue={record?.state} />
      </div>
      <Field label="CEP" name="zipCode" defaultValue={record?.zipCode} />
      {record && <StatusField defaultValue={record.status} />}
    </>
  );
}
function StatusField({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="text-sm font-bold">
      Situação
      <select
        name="status"
        defaultValue={defaultValue ?? "active"}
        className="mt-2 h-11 w-full rounded-md border border-[#cfd6d1] px-3 font-normal"
      >
        <option value="active">Ativa</option>
        <option value="inactive">Inativa</option>
      </select>
    </label>
  );
}
function RoomFields({
  locations,
  record,
}: {
  locations: Option[];
  record?: AdminRecord;
}) {
  // Na edição nada muda nas fotos a menos que a pessoa peça.
  const [randomImages, setRandomImages] = useState(!record);
  const [chosen, setChosen] = useState(0);
  return (
    <>
      <Select
        label="Unidade"
        name="locationId"
        options={locations}
        defaultValue={record?.locationId}
      />
      <Field label="Nome" name="name" defaultValue={record?.name} />
      <Field
        label="Descrição"
        name="description"
        defaultValue={record?.description}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Capacidade"
          name="capacity"
          type="number"
          defaultValue={record?.capacity}
        />
        <Field
          label="Preço/hora em centavos"
          name="hourlyPriceCents"
          type="number"
          defaultValue={record?.hourlyPriceCents}
        />
      </div>
      <Checkbox
        name="randomImages"
        label={
          record
            ? "Trocar por imagem aleatória"
            : "Adicionar imagens aleatórias"
        }
        hint={
          record
            ? "Substitui as fotos atuais por uma escolhida pelo Roomly."
            : "O Roomly escolhe a foto da sala e o anexo fica desabilitado."
        }
        checked={randomImages}
        onChange={setRandomImages}
      />
      {!randomImages && (
        <label className="text-sm font-bold">
          Fotos da sala
          <input
            required={!record}
            multiple
            type="file"
            name="photos"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setChosen(event.target.files?.length ?? 0)}
            className="mt-2 w-full rounded-md border border-[#cfd6d1] p-2 text-sm font-normal file:mr-3 file:rounded file:border-0 file:bg-[#e9ece8] file:px-3 file:py-1.5 file:text-sm file:font-semibold"
          />
          <span
            className={
              chosen > 6
                ? "mt-1 block text-xs font-semibold text-[#a84331]"
                : "mt-1 block text-xs font-normal text-[#78837e]"
            }
          >
            {chosen > 6
              ? `${chosen} selecionadas. O máximo é 6.`
              : record && chosen === 0
                ? "Deixe vazio para manter as fotos atuais."
                : `De 1 a 6 imagens, até 2 MB cada. ${chosen} selecionada(s).`}
          </span>
        </label>
      )}
      <Checkbox
        name="hasCamera"
        label="Sala possui câmera?"
        defaultChecked={record?.hasCamera === "on"}
      />
      {record && <StatusField defaultValue={record.status} />}
    </>
  );
}
function Checkbox({
  name,
  label,
  hint,
  checked,
  defaultChecked = false,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm font-bold">
      <input
        type="checkbox"
        name={name}
        defaultChecked={onChange ? undefined : defaultChecked}
        checked={onChange ? checked : undefined}
        onChange={
          onChange ? (event) => onChange(event.target.checked) : undefined
        }
        className="mt-0.5 size-4 accent-[#176b4d]"
      />
      <span>
        {label}
        {hint && (
          <span className="mt-0.5 block text-xs font-normal text-[#78837e]">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
function LockFields({
  rooms,
  record,
}: {
  rooms: Option[];
  record?: AdminRecord;
}) {
  return (
    <>
      <Select
        label="Sala"
        name="roomId"
        options={rooms}
        defaultValue={record?.roomId}
      />
      <Field label="Nome" name="name" defaultValue={record?.name} />
      <Field
        label="ID externo TTLock"
        name="externalLockId"
        defaultValue={record?.externalLockId}
      />
      <Field
        label="ID do gateway"
        name="gatewayId"
        required={false}
        defaultValue={record?.gatewayId}
      />
    </>
  );
}
function InvitationFields() {
  return (
    <>
      <Field label="E-mail" name="email" type="email" />
      <Select
        label="Papel"
        name="role"
        options={[
          { id: "customer", name: "Cliente" },
          { id: "employee", name: "Operação" },
          { id: "manager", name: "Gerente" },
          { id: "admin", name: "Administrador" },
        ]}
      />
    </>
  );
}
function Select({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Option[];
  defaultValue?: string;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <select
        required
        name={name}
        defaultValue={defaultValue ?? ""}
        className="mt-2 h-11 w-full rounded-md border border-[#cfd6d1] bg-white px-3 font-normal"
      >
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
