"use client";
import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import {
  createAdminResource,
  updateAdminResource,
  type AdminActionState,
} from "@/app/admin/actions";
import type { AdminRecord, AdminResource } from "@/lib/admin-sections";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, useCloseDialog } from "@/components/ui/dialog";

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
  const editing = Boolean(record);
  return (
    <Dialog
      title={editing ? `Editar ${record?.name ?? ""}` : label}
      trigger={
        editing
          ? {
              label: "Editar",
              icon: <Pencil size={15} />,
              variant: "secondary",
              size: "sm",
              ariaLabel: `Editar ${record?.name ?? ""}`,
            }
          : { label, icon: <Plus size={17} /> }
      }
    >
      <DialogForm
        section={section}
        record={record}
        locations={locations}
        rooms={rooms}
      />
    </Dialog>
  );
}

function DialogForm({
  section,
  record,
  locations,
  rooms,
}: {
  section: AdminResource | "clientes";
  record?: AdminRecord;
  locations: Option[];
  rooms: Option[];
}) {
  const close = useCloseDialog();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    record ? updateAdminResource : createAdminResource,
    { ok: false },
  );
  // O convite mostra o link na própria tela quando o Resend não está
  // configurado, então esse diálogo não pode fechar sozinho ao salvar.
  const fechaAoSalvar = section !== "clientes";
  useEffect(() => {
    if (state.ok && fechaAoSalvar) close();
  }, [state, fechaAoSalvar, close]);

  return (
    <form action={action}>
      <input type="hidden" name="resource" value={section} />
      {record?.id && <input type="hidden" name="id" value={record.id} />}
      <div className="grid gap-4">
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
        <Alert tone="danger" className="mt-4">
          {state.error}
        </Alert>
      )}
      {state.ok && state.message && section === "clientes" && (
        <Alert tone={state.tone ?? "success"} className="mt-4">
          <span className="break-all">{state.message}</span>
        </Alert>
      )}
      <Button type="submit" loading={pending} className="mt-6 w-full">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
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
    <label className="text-subheadline font-bold">
      {label}
      <input
        required={required}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-md border border-[var(--border-control)] px-3 font-normal"
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
    <label className="text-subheadline font-bold">
      Situação
      <select
        name="status"
        defaultValue={defaultValue ?? "active"}
        className="mt-2 h-11 w-full rounded-md border border-[var(--border-control)] px-3 font-normal"
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
      <fieldset className="rounded-md border border-border-subtle p-3">
        <legend className="px-1 text-caption font-bold uppercase text-text-secondary">
          Sobre o espaço
        </legend>
        <Field
          label="Tamanho em m² (opcional)"
          name="sizeSqm"
          type="number"
          required={false}
          defaultValue={record?.sizeSqm}
        />
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          <Checkbox
            name="hasWifi"
            label="Wi-Fi"
            defaultChecked={record?.hasWifi === "on"}
          />
          <Checkbox
            name="hasAirConditioning"
            label="Ar-condicionado"
            defaultChecked={record?.hasAirConditioning === "on"}
          />
          <Checkbox
            name="hasCoffee"
            label="Café / água"
            defaultChecked={record?.hasCoffee === "on"}
          />
          <Checkbox
            name="hasParking"
            label="Estacionamento"
            defaultChecked={record?.hasParking === "on"}
          />
        </div>
        <div className="mt-3">
          <Field
            label="Link do mapa (opcional)"
            name="mapUrl"
            type="url"
            required={false}
            defaultValue={record?.mapUrl}
          />
        </div>
        <label className="mt-3 block text-subheadline font-bold">
          Instruções de chegada (opcional)
          <textarea
            name="arrivalInstructions"
            rows={3}
            defaultValue={record?.arrivalInstructions}
            placeholder="Como encontrar a sala: andar, recepção, o que dizer na entrada."
            className="mt-2 w-full rounded-md border border-[var(--border-control)] p-3 font-normal"
          />
        </label>
      </fieldset>
      <fieldset className="rounded-md border border-border-subtle p-3">
        <legend className="px-1 text-caption font-bold uppercase text-text-secondary">
          Acionar a limpeza
        </legend>
        <div className="grid grid-cols-[110px_1fr] items-end gap-3">
          <Field
            label="Minutos"
            name="cleaningNoticeMinutes"
            type="number"
            defaultValue={record?.cleaningNoticeMinutes ?? "0"}
          />
          <Select
            label="Quando"
            name="cleaningNoticeWhen"
            options={[
              { id: "antes", name: "antes de acabar a reunião" },
              { id: "fim", name: "no momento em que acabar" },
              { id: "depois", name: "após acabar a reunião" },
            ]}
            defaultValue={record?.cleaningNoticeWhen ?? "fim"}
          />
        </div>
        <p className="mt-2 text-caption text-text-secondary">
          Com &quot;no momento em que acabar&quot;, os minutos são ignorados.
        </p>
      </fieldset>
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
        <label className="text-subheadline font-bold">
          Fotos da sala
          <input
            required={!record}
            multiple
            type="file"
            name="photos"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setChosen(event.target.files?.length ?? 0)}
            className="mt-2 w-full rounded-md border border-[var(--border-control)] p-2 text-subheadline font-normal file:mr-3 file:rounded file:border-0 file:bg-surface-page file:px-3 file:py-1.5 file:text-subheadline file:font-semibold"
          />
          <span
            className={
              chosen > 6
                ? "mt-1 block text-caption font-semibold text-danger-text"
                : "mt-1 block text-caption font-normal text-[var(--text-secondary)]"
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
    <label className="flex items-start gap-2.5 text-subheadline font-bold">
      <input
        type="checkbox"
        name={name}
        defaultChecked={onChange ? undefined : defaultChecked}
        checked={onChange ? checked : undefined}
        onChange={
          onChange ? (event) => onChange(event.target.checked) : undefined
        }
        className="mt-0.5 size-4 accent-action-primary"
      />
      <span>
        {label}
        {hint && (
          <span className="mt-0.5 block text-caption font-normal text-[var(--text-secondary)]">
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
    <label className="text-subheadline font-bold">
      {label}
      <select
        required
        name={name}
        defaultValue={defaultValue ?? ""}
        className="mt-2 h-11 w-full rounded-md border border-[var(--border-control)] bg-surface-raised px-3 font-normal"
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
