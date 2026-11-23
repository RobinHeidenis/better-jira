import { Component, type ReactNode } from "react";

const typeName = (type: unknown) =>
  typeof type === "string" && type ? type : "unknown";

export const UnsupportedBlock = ({ type }: { type: unknown }) => (
  <div className="my-2 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">
    Unsupported content: {typeName(type)}
  </div>
);

export const UnsupportedInline = ({ type }: { type: unknown }) => (
  <span className="rounded-sm border border-dashed px-1 text-xs text-muted-foreground">
    Unsupported content: {typeName(type)}
  </span>
);

// Descriptions arrive unvalidated, so a node with attrs we didn't foresee
// should cost one placeholder rather than the whole issue page.
export class AdfErrorBoundary extends Component<
  { type: unknown; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <UnsupportedBlock type={this.props.type} />;
    return this.props.children;
  }
}
