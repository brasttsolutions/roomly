"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  createAdminResource,
  type AdminActionState,
} from "@/app/admin/actions";

type Option = { id: string; name: string };

export function AdminCreateDialog({
  section,
  label,
  locations,
  rooms,
}: {
  section: "unidades" | "salas" | "fechaduras" | "clientes";
  label: string;
  locations: Option[];
  rooms: Option[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    createAdminResource,
    { ok: false },
  );
  useEffect(() => {
    if (state.ok && section !== "clientes") dialog.current?.close();
  }, [section, state]);
  return (
    <>
      <button
        onClick={() => dialog.current?.showModal()}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-[#176b4d] px-4 text-sm font-bold text-white"
      >
        <Plus size={17} />
        {label}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(92vw,520px)] rounded-lg border border-[#d9ded9] bg-white p-0 backdrop:bg-black/35"
      >
        <form action={action} className="p-6">
          <input type="hidden" name="resource" value={section} />
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{label}</h2>
            <button
              type="button"
              title="Fechar"
              onClick={() => dialog.current?.close()}
              className="grid size-9 place-items-center rounded-md hover:bg-[#eef1ed]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-5 grid gap-4">
            {section === "unidades" && <UnitFields />}
            {section === "salas" && <RoomFields locations={locations} />}
            {section === "fechaduras" && <LockFields rooms={rooms} />}
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
      </dialog>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        required
        name={name}
        type={type}
        className="mt-2 h-11 w-full rounded-md border border-[#cfd6d1] px-3 font-normal"
      />
    </label>
  );
}
function UnitFields() {
  return (
    <>
      <Field label="Nome" name="name" />
      <Field label="Endereço" name="address" />
      <div className="grid grid-cols-[1fr_90px] gap-3">
        <Field label="Cidade" name="city" />
        <Field label="UF" name="state" />
      </div>
      <Field label="CEP" name="zipCode" />
    </>
  );
}
function RoomFields({ locations }: { locations: Option[] }) {
  const [randomImages, setRandomImages] = useState(true);
  const [chosen, setChosen] = useState(0);
  return (
    <>
      <Select label="Unidade" name="locationId" options={locations} />
      <Field label="Nome" name="name" />
      <Field label="Descrição" name="description" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Capacidade" name="capacity" type="number" />
        <Field
          label="Preço/hora em centavos"
          name="hourlyPriceCents"
          type="number"
        />
      </div>
      <Checkbox
        name="randomImages"
        label="Adicionar imagens aleatórias"
        hint="O Roomly escolhe a foto da sala e o anexo fica desabilitado."
        checked={randomImages}
        onChange={setRandomImages}
      />
      {!randomImages && (
        <label className="text-sm font-bold">
          Fotos da sala
          <input
            required
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
              : `De 1 a 6 imagens, até 2 MB cada. ${chosen} selecionada(s).`}
          </span>
        </label>
      )}
      <Checkbox name="hasCamera" label="Sala possui câmera?" />
    </>
  );
}
function Checkbox({
  name,
  label,
  hint,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  checked?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm font-bold">
      <input
        type="checkbox"
        name={name}
        defaultChecked={onChange ? undefined : false}
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
function LockFields({ rooms }: { rooms: Option[] }) {
  return (
    <>
      <Select label="Sala" name="roomId" options={rooms} />
      <Field label="Nome" name="name" />
      <Field label="ID externo TTLock" name="externalLockId" />
      <Field label="ID do gateway" name="gatewayId" />
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
}: {
  label: string;
  name: string;
  options: Option[];
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <select
        required
        name={name}
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
