"use client";

import { Button } from "@/components/ui/button";

type Props = {
  action: () => void | Promise<void>;
  label: string;
  confirmText: string;
  variant?: "outline" | "destructive" | "ghost";
};

export function ConfirmButton({ action, label, confirmText, variant = "outline" }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <Button type="submit" size="sm" variant={variant}>{label}</Button>
    </form>
  );
}