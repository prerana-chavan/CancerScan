# 07. pgAdmin4 Management Guide

pgAdmin4 is a popular desktop application used to visually manage PostgreSQL databases. This guide shows how to connect pgAdmin4 to your Neon cloud database.

## 1. Connecting pgAdmin4 to Neon

1. Open **pgAdmin4** on your computer.
2. In the top left corner, right-click **Servers** → **Register** → **Server...**
3. In the **General** tab:
   * **Name:** `CancerScan Neon DB`
4. In the **Connection** tab, enter your Neon credentials:
   * **Host name/address:** `ep-morning-sea-aoi12tm7-pooler.c-2.ap-southeast-1.aws.neon.tech`
   * **Port:** `5432`
   * **Maintenance database:** `neondb`
   * **Username:** `neondb_owner`
   * **Password:** *(Enter the password from your Neon dashboard)*
   * **Save password?** Check the box.
5. In the **Parameters** tab:
   * Click the `+` button to add a new parameter.
   * **Role:** `sslmode`
   * **Value:** `require`
   *(Neon databases absolutely require SSL to connect).*
6. Click **Save**.

## 2. Browsing Data Without Writing SQL

If you don't know SQL, you can still view all your data easily:

1. Expand the tree on the left: `Servers` → `CancerScan Neon DB` → `Databases` → `neondb` → `Schemas` → `public` → `Tables`.
2. You will see your 4 tables: `audit_logs`, `doctors`, `password_reset_tokens`, `patients`.
3. **Right-click** on a table (for example, `doctors`).
4. Select **View/Edit Data** → **All Rows**.
5. The data will appear in a spreadsheet-like grid at the bottom of the screen.
6. You can literally double-click a cell to change the data, and then click the **Save Data Changes** (floppy disk) icon at the top of the grid to save it.

## 3. Exporting Data to CSV Visually

If the professors ask you to prove the data is real, you can export it:

1. Right-click the `patients` table.
2. Select **Import/Export Data...**
3. Switch the slider at the top to **Export**.
4. **Filename:** Click the folder icon and choose where to save it on your computer (e.g., `Desktop\patients_export.csv`).
5. **Format:** Choose `csv`.
6. **Header:** Switch to `Yes` (so the CSV has column names).
7. Click **OK**.

## 4. Backing Up the Database

To create a complete backup of the cloud database onto your local laptop:

1. Right-click the `neondb` database in the tree.
2. Select **Backup...**
3. **Filename:** `Desktop\cancerscan_backup.sql`
4. **Format:** Choose `Plain` (so you can read the SQL code later).
5. Click **Backup**.

> [!TIP]
> Always run a backup the night before your Viva presentation!
