// Shared client-side data shapes used by calendar / today / session forms.

export type ActiveCustomer = {
  id: string;
  name: string;
};

export type ActivePairGroup = {
  id: string;
  name: string;
  customer_a_id: string;
  customer_b_id: string;
};

export type ActiveBundle = {
  id: string;
  plan_id: string;
  plan_name: string;
  is_pair: boolean;
  customer_id: string | null;
  pair_group_id: string | null;
  remaining_count: number;
};

export type SessionEvent = {
  id: string;
  start_at: string;
  end_at: string;
  status: "scheduled" | "confirmed" | "canceled";
  notes: string | null;
  participants: {
    customer_id: string;
    customer_name: string;
    ticket_bundle_id: string;
    is_pair_primary: boolean;
    consumed: boolean;
  }[];
};
