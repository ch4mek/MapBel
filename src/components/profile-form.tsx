"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { updateProfileAction, type ProfileFormState } from "@/lib/actions/profile";
import { Alert } from "@/components/ui/primitives";

export function ProfileForm({
  displayName,
  bio,
  homeCity,
}: {
  displayName: string;
  bio: string | null;
  homeCity: string | null;
}) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="displayName">
            Отображаемое имя
          </label>
          <input
            id="displayName"
            name="displayName"
            className="input"
            required
            minLength={2}
            maxLength={40}
            defaultValue={displayName}
          />
        </div>
        <div>
          <label className="label" htmlFor="homeCity">
            Родной город
          </label>
          <input id="homeCity" name="homeCity" className="input" maxLength={60} defaultValue={homeCity ?? ""} placeholder="Минск" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="bio">
          О себе
        </label>
        <textarea
          id="bio"
          name="bio"
          className="input min-h-20"
          maxLength={300}
          defaultValue={bio ?? ""}
          placeholder="Люблю замки и долгие пешие маршруты"
        />
      </div>
      {state.error && (
        <Alert tone="danger" icon={CircleAlert}>
          {state.error}
        </Alert>
      )}
      {state.ok && (
        <Alert tone="success" icon={CircleCheck}>
          Профиль обновлён. Новое имя в шапке появится после повторного входа.
        </Alert>
      )}
      <button className="btn btn-primary self-start" type="submit" disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
