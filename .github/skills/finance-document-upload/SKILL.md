---
name: finance-document-upload
description: Use when implementing invoice, bon faktur, or payment document uploads for logistics and finance workflows.
---

# Finance Document Upload

## Existing upload conventions

- For PO invoices and direct stock purchase invoices/bon faktur, use the existing Cloudinary folder constant `PURCHASE_ORDER_INVOICE_CLOUDINARY_FOLDER` from `src/lib/purchase-order-invoice-config.ts`.
- For direct stock purchase invoice photos, use a regular **Unggah Invoice/Bon** button to open the browser's native local file picker. Stage the selected file in client state; upload only when the separate save/send button is pressed. Do not use `CldUploadWidget` for this flow.
- Pass the selected `File` and record ID in `FormData` to a server action. The action must authenticate and authorize the role, validate the record's current workflow status, then validate the file's MIME type, actual image signature, and size on the server.
- Upload with the server-side `uploadCloudinaryPhoto` helper; never trust a client-provided Cloudinary URL for this flow. Validate the returned URL with `isPurchaseOrderInvoiceUrl`.
- Attach the uploaded URL and uploader metadata to the record only after rechecking its status inside a database transaction. If persistence fails after upload, delete the unattached Cloudinary asset and log cleanup failures explicitly.
- Revalidate affected pages after the database transaction commits. The UI should show the selected local filename and an explicit save/send action, then refresh into the next workflow state on success.
- For existing PO invoice flows, keep their current signed upload endpoint `/api/cloudinary/purchase-order-invoice-signature` unless that flow is explicitly migrated to the native-file/server-action pattern.
- Follow the existing `PurchaseOrder` field convention for invoice documents: `vendorInvoiceUrl`, `vendorInvoiceUploadedAt`, and `vendorInvoiceUploadedById`. Apply the same naming to other purchase models when they store equivalent vendor-issued documents.

## Direct stock purchase lifecycle

The required lifecycle is:

1. Logistics submits the direct purchase request.
2. Director approves the request.
3. Logistics selects a local invoice/bon photo and presses **Simpan & Kirim ke Keuangan**; the server action uploads it to Cloudinary and attaches it to the purchase.
4. Finance can pay only after the invoice/bon is attached; enforce this on the server action as well as hiding/disabling the UI.

Do not require the vendor to sign in or upload the document. The Logistics team attaches the document they receive from the vendor.

When a purchase form is shown before the request is submitted, do not show the upload control yet. Explain that it becomes available only after Director approval (and, for PO, after the vendor PO is sent).

## Reusing the local-file upload flow

For another workflow that uploads a photo and advances a record:

1. Trigger a native `<input type="file">` from a regular upload button and keep the selected `File` in client state; do not upload when the file is selected.
2. On the explicit save/submit button, send the file and record ID as `FormData` to a server action.
3. In the action, check authentication and role, validate the record's allowed current state, and validate the uploaded file on the server.
4. Upload through the existing server-side Cloudinary helper into the feature's configured folder.
5. In a transaction, conditionally update the record so stale or concurrent submissions cannot advance it twice. Store the Cloudinary URL and uploader/timestamp metadata together.
6. If the transaction fails, remove the newly uploaded but unattached asset. Log cleanup errors; do not report success.
7. Revalidate affected routes and show the next workflow step only after persistence succeeds.

Do not pass Cloudinary credentials or signed-upload widgets to the browser for this pattern. The browser only selects the local file; the authenticated backend owns validation, upload, persistence, and cleanup.

## Ticket procurement form data

- The `/apps/tickets` page must load and pass the approved vendor list and stock catalog (including `sku`, `unit`, and `unitPrice`) through `TicketsApp` into `TicketListing`.
- Otherwise ticket procurement dialogs render empty vendor/catalog selects and the ticket's requested item is shown as unregistered, even if it exists in the database.

## Database changes

After changing `prisma/schema.prisma`, run Prisma formatting and generation, validate the schema, and run `npx prisma db push` when database synchronization is requested. Confirm that generated Prisma types and the application type-check successfully.
