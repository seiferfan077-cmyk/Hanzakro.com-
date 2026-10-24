import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { createPlatformLink, createPlatformVideo, createPlatformVideoNote, deletePlatformLink } from "./platformsDb";

const mockedGetDb = vi.mocked(getDb);

function makeDb() {
  const values = vi.fn().mockResolvedValue([{ insertId: 41 }]);
  const insert = vi.fn(() => ({ values }));
  const limit = vi.fn().mockResolvedValue([{ id: 7 }]);
  const whereResult = Object.assign([] as Array<{ id: number }>, { limit });
  const where = vi.fn(() => whereResult);
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const remove = vi.fn(() => ({ where: deleteWhere }));
  return { db: { insert, select, delete: remove } as never, values, select, from, where, whereResult, limit, remove, deleteWhere };
}

describe("platforms CRUD", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves a normalized platform link with the member slot", async () => {
    const mock = makeDb();
    mockedGetDb.mockResolvedValue(mock.db);
    await expect(createPlatformLink({ title: "منصة المدرسة", url: "school.example.com", description: "شرح المواد" }, "haneen")).resolves.toBe(41);
    expect(mock.values).toHaveBeenCalledWith(expect.objectContaining({ title: "منصة المدرسة", url: "https://school.example.com/", host: "school.example.com", createdBy: "haneen", updatedBy: "haneen" }));
  });

  it("stores a YouTube source as a playable no-cookie embed and keeps external download disabled", async () => {
    const mock = makeDb();
    mockedGetDb.mockResolvedValue(mock.db);
    await expect(createPlatformVideo({ platformLinkId: 7, title: "درس مهم", sourceUrl: "https://youtu.be/dQw4w9WgXcQ" }, "saif")).resolves.toBe(41);
    expect(mock.values).toHaveBeenCalledWith(expect.objectContaining({ platformLinkId: 7, kind: "youtube", videoId: "dQw4w9WgXcQ", allowDownload: false, createdBy: "saif" }));
  });

  it("requires an existing video before saving a timestamped note and cascades link deletion", async () => {
    const mock = makeDb();
    mock.limit.mockResolvedValueOnce([{ id: 9 }]).mockResolvedValueOnce([{ id: 12 }, { id: 13 }]);
    mockedGetDb.mockResolvedValue(mock.db);
    await expect(createPlatformVideoNote({ videoId: 9, atSeconds: 86, note: "الفكرة الأساسية" }, "haneen")).resolves.toBe(41);
    expect(mock.values).toHaveBeenCalledWith(expect.objectContaining({ videoId: 9, atSeconds: 86, note: "الفكرة الأساسية", createdBy: "haneen", updatedBy: "haneen" }));
    mock.whereResult.push({ id: 12 }, { id: 13 });
    await deletePlatformLink(7);
    expect(mock.remove).toHaveBeenCalledTimes(4);
    expect(mock.deleteWhere).toHaveBeenCalledTimes(4);
  });
});
