import { api } from "@sojourn/backend/convex/_generated/api";
import { Input } from "@sojourn/ui/components/input";
import { useQuery } from "convex/react";

/** Free-form "#at #AppalachianTrail" input with suggestions from tags already in use. */
export function TagInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const lastToken = value.split(/[\s,]+/).pop() ?? "";
  const suggestions = useQuery(api.journeys.suggestTags, lastToken.replace(/^#/, "") ? { prefix: lastToken } : "skip");

  return (
    <div className="space-y-1">
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="#at #AppalachianTrail #nobo" />
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              className="border border-border px-1.5 py-0.5 font-mono text-xs hover:bg-muted"
              onClick={() => onChange(`${value.slice(0, value.length - lastToken.length)}#${tag} `)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
