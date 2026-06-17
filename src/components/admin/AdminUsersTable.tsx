'use client';

import { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, Check, ChevronDown, Search, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
}

type RoleFilter = 'all' | 'admin' | 'user';

export function AdminUsersTable({
  users,
  onDeleteUser,
}: {
  users: AdminUserRow[];
  onDeleteUser: (userId: string) => Promise<void>;
}) {
  const t = useTranslations('common');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [pendingDelete, setPendingDelete] = useState<AdminUserRow | null>(null);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [roleFilter, search, users]);

  const columns = useMemo<ColumnDef<AdminUserRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-slate-950">{row.original.name}</p>
            <p className="text-xs text-slate-500">{row.original.id}</p>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              row.original.role === 'admin'
                ? 'bg-violet-100 text-violet-800'
                : 'bg-sky-100 text-sky-800'
            }`}
          >
            {row.original.role}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            onClick={() => setPendingDelete(row.original)}
            type="button"
          >
            <Trash2 aria-hidden="true" size={14} />
            {t('delete')}
          </button>
        ),
      },
    ],
    [t]
  );

  const table = useReactTable({
    columns,
    data: filteredUsers,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await onDeleteUser(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search aria-hidden="true" className="absolute left-3 text-slate-400" size={16} />
          <span className="sr-only">{t('searchUsers')}</span>
          <input
            className="input-field pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchUsers')}
            value={search}
          />
        </label>

        <Select.Root onValueChange={(value) => setRoleFilter(value as RoleFilter)} value={roleFilter}>
          <Select.Trigger
            aria-label="Role filter"
            className="inline-flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <Select.Value />
            <ChevronDown aria-hidden="true" size={16} />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl"
              position="popper"
              sideOffset={8}
            >
              <Select.Viewport>
                {[
                  ['all', t('allUsers')],
                  ['admin', t('admins')],
                  ['user', t('regularUsers')],
                ].map(([value, label]) => (
                  <Select.Item
                    className="relative flex cursor-pointer select-none items-center rounded-xl px-8 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                    key={value}
                    value={value}
                  >
                    <Select.ItemIndicator className="absolute left-2">
                      <Check aria-hidden="true" size={14} />
                    </Select.ItemIndicator>
                    <Select.ItemText>{label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700" key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          className="inline-flex items-center gap-1"
                          disabled={!header.column.getCanSort()}
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp aria-hidden="true" size={13} />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown aria-hidden="true" size={13} />
                          ) : null}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr className="border-t border-slate-100 hover:bg-slate-50" key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td className="px-4 py-3 text-sm text-slate-700" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!table.getRowModel().rows.length ? (
          <div className="border-t border-slate-100 px-4 py-8 text-center text-sm text-slate-500">
            No users found.
          </div>
        ) : null}
      </div>

      <Dialog.Root open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold text-slate-950">
                  {t('deleteUser')}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">
                  This will delete {pendingDelete?.name} and all related user data.
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
                <X aria-hidden="true" size={18} />
                <span className="sr-only">{t('cancel')}</span>
              </Dialog.Close>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close className="btn-outline" type="button">
                {t('cancel')}
              </Dialog.Close>
              <button className="btn-primary bg-rose-700 hover:bg-rose-800" onClick={confirmDelete} type="button">
                {t('delete')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
