// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { en } from "@snapotter/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", async () => {
  const { analyticsModuleMock } = await import("../../helpers/mock-analytics.js");
  return analyticsModuleMock();
});

vi.mock("@/contexts/i18n-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/i18n-context")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: en,
      locale: "en",
      dir: "ltr",
      setLocale: () => {},
      supportedLocales: [],
    }),
  };
});

import { BulkRenameSettings } from "@/components/tools/bulk-rename-settings";
import { useFileStore } from "@/stores/file-store";

function makeFile(name: string, type = "image/png"): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type });
}

describe("BulkRenameSettings {{original}} preview stem (#3034)", () => {
  beforeEach(() => {
    let blobCount = 0;
    URL.createObjectURL = vi.fn(() => `blob:mock-${++blobCount}`);
    URL.revokeObjectURL = vi.fn();
    useFileStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    useFileStore.getState().reset();
  });

  it("strips only the trailing extension when the filename stem contains the extension substring", () => {
    useFileStore
      .getState()
      .setFiles([
        makeFile("my.png.photo.png", "image/png"),
        makeFile("logo.svg.backup.svg", "image/svg+xml"),
        makeFile("README", "application/octet-stream"),
        makeFile(".png", "image/png"),
        makeFile("price$$100$&.png", "image/png"),
      ]);

    render(<BulkRenameSettings />);

    const patternInput = screen.getByLabelText(/pattern/i);
    fireEvent.change(patternInput, { target: { value: "{{original}}-copy" } });

    expect(screen.getByText("my.png.photo-copy.png")).toBeInTheDocument();
    expect(screen.getByText("logo.svg.backup-copy.svg")).toBeInTheDocument();
    expect(screen.getByText("README-copy")).toBeInTheDocument();
    expect(screen.getByText(".png-copy")).toBeInTheDocument();
    expect(screen.getByText("price$$100$&-copy.png")).toBeInTheDocument();

    fireEvent.change(patternInput, { target: { value: "{{original}}-{{original}}" } });
    expect(screen.getByText("my.png.photo-my.png.photo.png")).toBeInTheDocument();
  });
});
