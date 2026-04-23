import tkinter as tk
from tkinter import ttk, messagebox
import database

class AdminPanel:
    def __init__(self, root):
        self.root = root
        self.root.title("Lung Cancer System - Admin Panel")
        self.root.geometry("1200x600")
        
        # Style
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("Treeview", rowheight=25)
        style.configure("Treeview.Heading", font=('Arial', 10, 'bold'))
        
        # Header
        header_frame = tk.Frame(self.root, bg="#2c3e50")
        header_frame.pack(fill=tk.X)
        tk.Label(header_frame, text="Patient Records Admin Panel", font=("Arial", 18, "bold"), fg="white", bg="#2c3e50", pady=10).pack()
        
        # Toolbar
        toolbar_frame = tk.Frame(self.root)
        toolbar_frame.pack(fill=tk.X, padx=10, pady=5)
        
        tk.Button(toolbar_frame, text="🔄 Refresh", command=self.load_data, bg="#3498db", fg="white", font=("Arial", 10)).pack(side=tk.LEFT, padx=5)
        tk.Button(toolbar_frame, text="🗑️ Delete Selected", command=self.delete_record, bg="#e74c3c", fg="white", font=("Arial", 10)).pack(side=tk.LEFT, padx=5)
        tk.Button(toolbar_frame, text="🚪 Logout", command=self.logout, bg="#7f8c8d", fg="white", font=("Arial", 10)).pack(side=tk.LEFT, padx=5)
        
        # Search Bar
        tk.Label(toolbar_frame, text="Search (ID/Name/Date):", font=("Arial", 10)).pack(side=tk.LEFT, padx=(20, 5))
        self.search_entry = tk.Entry(toolbar_frame, width=30)
        self.search_entry.pack(side=tk.LEFT, padx=5)
        tk.Button(toolbar_frame, text="🔍 Search", command=self.search_data, bg="#27ae60", fg="white", font=("Arial", 10)).pack(side=tk.LEFT, padx=5)
        
        # Treeview Frame
        tree_frame = tk.Frame(self.root)
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Scrollbars
        scroll_y = ttk.Scrollbar(tree_frame)
        scroll_y.pack(side=tk.RIGHT, fill=tk.Y)
        
        scroll_x = ttk.Scrollbar(tree_frame, orient=tk.HORIZONTAL)
        scroll_x.pack(side=tk.BOTTOM, fill=tk.X)
        
        # Treeview
        columns = ("ID", "Patient ID", "Name", "Age", "Gender", "Smoking", "Diagnosis Date", "Hospital", "Pathologist", "Prediction", "Subtype", "Survival", "Created At")
        self.tree = ttk.Treeview(tree_frame, columns=columns, show="headings", yscrollcommand=scroll_y.set, xscrollcommand=scroll_x.set)
        
        scroll_y.config(command=self.tree.yview)
        scroll_x.config(command=self.tree.xview)
        
        # Headings and Column Config
        col_width = {
            "ID": 40, "Patient ID": 80, "Name": 120, "Age": 50, "Gender": 60, 
            "Smoking": 60, "Diagnosis Date": 100, "Hospital": 120, "Pathologist": 100,
            "Prediction": 120, "Subtype": 150, "Survival": 80, "Created At": 150
        }
        
        for col in columns:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=col_width.get(col, 100), anchor="center")
            
        self.tree.pack(fill=tk.BOTH, expand=True)
        
        # Load Data
        self.load_data()

    def load_data(self):
        # Clear existing data
        for item in self.tree.get_children():
            self.tree.delete(item)
            
        # Fetch from DB (Default: All)
        records = database.get_all_patients()
        self.populate_tree(records)

    def search_data(self):
        query = self.search_entry.get().strip()
        if not query:
            self.load_data()
            return
            
        # Clear & Fetch Searched
        for item in self.tree.get_children():
            self.tree.delete(item)
            
        records = database.search_patients(query)
        self.populate_tree(records)

    def populate_tree(self, records):
        for row in records:
            display_values = (
                row[0], row[1], row[2], row[3], row[4], row[5], 
                row[6], row[7], row[8], row[10], row[11], row[12], row[13]
            )
            self.tree.insert("", tk.END, values=display_values)

    def delete_record(self):
        selected_item = self.tree.selection()
        if not selected_item:
            messagebox.showwarning("Warning", "Please select a record to delete.")
            return
        
        confirm = messagebox.askyesno("Confirm Delete", "Are you sure you want to delete this record?")
        if confirm:
            try:
                # Get ID from selected item
                item_values = self.tree.item(selected_item, "values")
                record_id = item_values[0] # ID is first column
                
                if database.delete_patient(record_id):
                    messagebox.showinfo("Success", "Record deleted successfully.")
                    self.load_data()
                else:
                    messagebox.showerror("Error", "Failed to delete from database.")
            except Exception as e:
                messagebox.showerror("Error", f"An error occurred: {e}")

    def logout(self):
        import os
        self.root.destroy()
        os.system("python main.py")

if __name__ == "__main__":
    database.init_db() # Ensure DB exists
    root = tk.Tk()
    app = AdminPanel(root)
    root.mainloop()
