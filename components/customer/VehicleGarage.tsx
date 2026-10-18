'use client';

import { useState } from 'react';
import { SubscriptionStatus, type Vehicle, type Subscription, type Plan } from '@prisma/client';
import { Car, Plus, ArrowRightLeft, XCircle, ShieldCheck, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import { LicensePlateBadge } from './LicensePlateBadge';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/date';
import { getActiveSubscription } from '@/lib/domain/subscription';
import { AddVehicleModal } from './AddVehicleModal';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { SubscribeModal } from './SubscribeModal';
import { TransferSubscriptionModal } from './TransferSubscriptionModal';
import { RemoveVehicleModal } from './RemoveVehicleModal';

export type SubscriptionWithPlan = Subscription & { plan: Plan };

export type VehicleWithSubscriptions = Vehicle & {
  subscriptions: SubscriptionWithPlan[];
};

interface VehicleGarageProps {
  vehicles: VehicleWithSubscriptions[];
  userId: string;
  availablePlans?: Plan[];
}

function PassBadge({ status }: { status?: SubscriptionStatus | null }) {
  if (status === SubscriptionStatus.ACTIVE) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <ShieldCheck className="w-3 h-3" />
        ACTIVE PASS
      </span>
    );
  }
  if (status === SubscriptionStatus.OVERDUE) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
        <ShieldAlert className="w-3 h-3" />
        OVERDUE PASS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
      NO ACTIVE PASS
    </span>
  );
}

function PassActionButtons({
  sub,
  vehicle,
  onCancel,
  onTransfer,
}: {
  sub: SubscriptionWithPlan;
  vehicle: Vehicle;
  onCancel: (sub: SubscriptionWithPlan, vehicle: Vehicle) => void;
  onTransfer: (sub: SubscriptionWithPlan, vehicle: Vehicle) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onTransfer(sub, vehicle)}
        title="Transfer membership pass to another vehicle"
        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
      >
        <ArrowRightLeft className="w-3 h-3 text-slate-500" />
        <span>Transfer</span>
      </button>
      <button
        type="button"
        onClick={() => onCancel(sub, vehicle)}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
      >
        <XCircle className="w-3 h-3 text-rose-500" />
        <span>Cancel</span>
      </button>
    </div>
  );
}

function ActivePassView({
  sub,
  vehicle,
  onCancel,
  onTransfer,
}: {
  sub: SubscriptionWithPlan;
  vehicle: Vehicle;
  onCancel: (sub: SubscriptionWithPlan, vehicle: Vehicle) => void;
  onTransfer: (sub: SubscriptionWithPlan, vehicle: Vehicle) => void;
}) {
  return (
    <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div>
          <h4 className="text-xs font-bold text-slate-900">{sub.plan.name}</h4>
          <p className="text-[11px] text-slate-500">
            {formatCurrency(sub.plan.priceCents)}/mo · Renews {formatDate(sub.nextBillingAt)}
          </p>
        </div>
        <PassActionButtons
          sub={sub}
          vehicle={vehicle}
          onCancel={onCancel}
          onTransfer={onTransfer}
        />
      </div>
    </div>
  );
}

function VacantPassView({
  vehicle,
  onSubscribe,
  onRemove,
}: {
  vehicle: Vehicle;
  onSubscribe: (vehicle: Vehicle) => void;
  onRemove: (vehicle: Vehicle) => void;
}) {
  return (
    <div className="mt-3 p-3 bg-amber-50/50 border border-dashed border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <p className="text-xs font-semibold text-slate-800">Unsubscribed Vehicle</p>
        <p className="text-[11px] text-slate-500">Eligible for a new wash membership or incoming transfer.</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onSubscribe(vehicle)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-sky-700 bg-white border border-sky-200 hover:bg-sky-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-3 h-3 text-sky-600" />
          <span>Attach Plan</span>
        </button>
        <button
          type="button"
          onClick={() => onRemove(vehicle)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          title="Remove vehicle from customer garage"
        >
          <Trash2 className="w-3 h-3 text-rose-500" />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
}

function VehicleCard({
  vehicle,
  onCancel,
  onSubscribe,
  onTransfer,
  onRemove,
}: {
  vehicle: VehicleWithSubscriptions;
  onCancel: (sub: SubscriptionWithPlan, vehicle: Vehicle) => void;
  onSubscribe: (vehicle: Vehicle) => void;
  onTransfer: (sub: SubscriptionWithPlan, vehicle: Vehicle) => void;
  onRemove: (vehicle: Vehicle) => void;
}) {
  const activeSub = getActiveSubscription(vehicle.subscriptions);

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <LicensePlateBadge plate={vehicle.licensePlate} />
          <div>
            <h3 className="text-xs font-bold text-slate-900 leading-snug">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-[11px] text-slate-500 capitalize">{vehicle.color}</p>
          </div>
        </div>
        <PassBadge status={activeSub?.status} />
      </div>

      {activeSub ? (
        <ActivePassView
          sub={activeSub}
          vehicle={vehicle}
          onCancel={onCancel}
          onTransfer={onTransfer}
        />
      ) : (
        <VacantPassView
          vehicle={vehicle}
          onSubscribe={onSubscribe}
          onRemove={onRemove}
        />
      )}
    </div>
  );
}

function EmptyGarage({ onAddVehicle }: { onAddVehicle: () => void }) {
  return (
    <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl">
      <Car className="w-6 h-6 text-slate-400 mx-auto mb-2" />
      <p className="text-xs font-semibold text-slate-700 mb-0.5">No vehicles registered</p>
      <p className="text-[11px] text-slate-500 mb-3">Add a customer vehicle to assign wash membership passes.</p>
      <button
        type="button"
        onClick={onAddVehicle}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-2xs transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add First Vehicle</span>
      </button>
    </div>
  );
}

function GarageHeader({ onAddVehicle }: { onAddVehicle: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
          <Car className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-950">Vehicle Garage & Passes</h2>
          <p className="text-[11px] text-slate-500">Manage memberships, transfers, and vehicle profiles.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onAddVehicle}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5 text-slate-500" />
        <span>Add Vehicle</span>
      </button>
    </div>
  );
}

interface GarageModalsProps {
  userId: string;
  vehicles: VehicleWithSubscriptions[];
  availablePlans?: Plan[];
  isAdding: boolean;
  subscribingVehicle: Vehicle | null;
  cancellingPass: { sub: SubscriptionWithPlan; vehicle: Vehicle } | null;
  transferringPass: { sub: SubscriptionWithPlan; vehicle: Vehicle } | null;
  removingVehicle: Vehicle | null;
  onCloseAdding: () => void;
  onCloseSubscribing: () => void;
  onCloseCancelling: () => void;
  onCloseTransferring: () => void;
  onCloseRemoving: () => void;
}

function GarageModals(props: GarageModalsProps) {
  return (
    <>
      {props.isAdding && <AddVehicleModal userId={props.userId} onClose={props.onCloseAdding} />}
      {props.subscribingVehicle && (
        <SubscribeModal
          vehicle={props.subscribingVehicle}
          availablePlans={props.availablePlans ?? []}
          onClose={props.onCloseSubscribing}
        />
      )}
      {props.cancellingPass && (
        <CancelSubscriptionModal
          subscription={props.cancellingPass.sub}
          vehicle={props.cancellingPass.vehicle}
          onClose={props.onCloseCancelling}
        />
      )}
      {props.transferringPass && (
        <TransferSubscriptionModal
          subscription={props.transferringPass.sub}
          sourceVehicle={props.transferringPass.vehicle}
          customerVehicles={props.vehicles}
          onClose={props.onCloseTransferring}
        />
      )}
      {props.removingVehicle && (
        <RemoveVehicleModal
          vehicle={props.removingVehicle}
          userId={props.userId}
          onClose={props.onCloseRemoving}
        />
      )}
    </>
  );
}

interface GarageVehicleListProps {
  vehicles: VehicleWithSubscriptions[];
  onCancel: (sub: SubscriptionWithPlan, vehicle: Vehicle) => void;
  onSubscribe: (vehicle: Vehicle) => void;
  onTransfer: (sub: SubscriptionWithPlan, vehicle: Vehicle) => void;
  onRemove: (vehicle: Vehicle) => void;
}

function GarageVehicleList({
  vehicles,
  onCancel,
  onSubscribe,
  onTransfer,
  onRemove,
}: GarageVehicleListProps) {
  return (
    <div className="space-y-3">
      {vehicles.map((v) => (
        <VehicleCard
          key={v.id}
          vehicle={v}
          onCancel={onCancel}
          onSubscribe={onSubscribe}
          onTransfer={onTransfer}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

export function VehicleGarage({
  vehicles,
  userId,
  availablePlans,
}: VehicleGarageProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [subscribingVehicle, setSubscribingVehicle] = useState<Vehicle | null>(null);
  const [cancellingPass, setCancellingPass] = useState<{
    sub: SubscriptionWithPlan;
    vehicle: Vehicle;
  } | null>(null);
  const [transferringPass, setTransferringPass] = useState<{
    sub: SubscriptionWithPlan;
    vehicle: Vehicle;
  } | null>(null);
  const [removingVehicle, setRemovingVehicle] = useState<Vehicle | null>(null);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
      <GarageHeader onAddVehicle={() => setIsAdding(true)} />

      {vehicles.length === 0 ? (
        <EmptyGarage onAddVehicle={() => setIsAdding(true)} />
      ) : (
        <GarageVehicleList
          vehicles={vehicles}
          onCancel={(sub, vehicle) => setCancellingPass({ sub, vehicle })}
          onSubscribe={(vehicle) => setSubscribingVehicle(vehicle)}
          onTransfer={(sub, vehicle) => setTransferringPass({ sub, vehicle })}
          onRemove={(vehicle) => setRemovingVehicle(vehicle)}
        />
      )}

      <GarageModals
        userId={userId}
        vehicles={vehicles}
        availablePlans={availablePlans}
        isAdding={isAdding}
        subscribingVehicle={subscribingVehicle}
        cancellingPass={cancellingPass}
        transferringPass={transferringPass}
        removingVehicle={removingVehicle}
        onCloseAdding={() => setIsAdding(false)}
        onCloseSubscribing={() => setSubscribingVehicle(null)}
        onCloseCancelling={() => setCancellingPass(null)}
        onCloseTransferring={() => setTransferringPass(null)}
        onCloseRemoving={() => setRemovingVehicle(null)}
      />
    </div>
  );
}
