"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, TextInput } from "./ui";

// A plain <form method="get"> does a full browser navigation, which always
// jumps to the top of the new page. Submitting through the router instead,
// with scroll: false, keeps you where you were while still updating ?q= and
// re-running the server query.
export function SearchForm({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (value.trim()) params.set("q", value.trim());
        router.push(params.toString() ? `/?${params}` : "/", { scroll: false });
      }}
    >
      <TextInput
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search players by name…"
        className="w-64"
      />
      <Button type="submit">Search</Button>
    </form>
  );
}
