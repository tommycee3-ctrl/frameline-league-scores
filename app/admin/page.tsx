import type { Metadata } from "next";
import { AdminEditor } from "./admin-editor";

export const metadata: Metadata = { title: "Staff Site Manager" };

export default function AdminPage() {
  return <AdminEditor />;
}
