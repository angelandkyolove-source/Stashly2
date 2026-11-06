"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollowAction } from "@/lib/actions";

export default function FollowButton({
  pid,
  initial,
  labels,
}: {
  pid: string;
  initial: boolean;
  labels: { follow: string; following: string };
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className={`btn follow${on ? " is-following" : ""}`}
      aria-pressed={on}
      disabled={pending}
      onClick={() => {
        setOn(!on);
        start(async () => {
          const r = await toggleFollowAction(pid);
          if (r === null) setOn(on);
          else setOn(r);
          router.refresh();
        });
      }}
    >
      {on ? labels.following : labels.follow}
    </button>
  );
}
