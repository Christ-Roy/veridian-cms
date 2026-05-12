/**
 * Convenience admin override to slot the UploadWithPreview component into a
 * Payload `upload` field. Use:
 *
 *   import { uploadWithPreviewAdmin } from '@/components/UploadWithPreview/field'
 *
 *   fields: [
 *     {
 *       name: 'image',
 *       type: 'upload',
 *       relationTo: 'media',
 *       label: 'Image de fond',
 *       admin: uploadWithPreviewAdmin(),
 *     },
 *   ]
 *
 * Pass `extra` to merge any other admin options (description, condition, etc.).
 *
 * Note: we return a loose object (no UploadField['admin'] typing) because the
 * Payload generic is polymorphic on `relationTo` (single vs many) and the
 * field-level admin shape can't be inferred without re-typing every call site.
 * The shape stays valid for any `type: 'upload'` field.
 */
type LooseAdmin = Record<string, unknown> & {
  components?: Record<string, unknown>
}

export const uploadWithPreviewAdmin = (extra: LooseAdmin = {}): LooseAdmin => ({
  ...extra,
  components: {
    ...(extra.components ?? {}),
    Field: '/components/UploadWithPreview/index.tsx#UploadWithPreview',
  },
})
