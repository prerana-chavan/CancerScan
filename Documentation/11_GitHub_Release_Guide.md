# 11. GitHub Release Guide

Because CancerScan is an Electron Desktop app, the final product is an `.exe` file. You need a place to host this file so your professors, teammates, or end-users can download it. 

The best place to do this is GitHub Releases.

## 1. How to Generate the `.exe`
As covered in the Frontend Guide, the first step is to compile the code.

1. Open your terminal in the `frontend` folder.
2. Run `npm run package`
3. Wait for the process to finish.
4. Locate the output file in `frontend/dist-electron/CancerScan Setup 1.0.0.exe`.

## 2. How to Upload to GitHub Releases

Now that you have the `.exe` file on your computer, here is how you upload it to GitHub so others can download it:

1. Open your web browser and go to your repository: [https://github.com/prerana-chavan/CancerScan](https://github.com/prerana-chavan/CancerScan)
2. On the right side of the screen, look for the **Releases** section.
3. Click on **Create a new release** (or "Draft a new release").
4. **Choose a tag:** Type `v1.0.0` and click "Create new tag: v1.0.0 on publish".
5. **Release Title:** `CancerScan Desktop App v1.0.0`
6. **Description:** Write a short note about the release:
   ```text
   Initial release of the CancerScan diagnostic tool.
   Includes:
   - 3-class Lung Cancer classification.
   - Macenko normalization.
   - Secure PDF report generation.
   ```
7. **Attach Binaries:** This is the most important part. Drag and drop the `CancerScan Setup 1.0.0.exe` file from your `dist-electron` folder into the attachment box.
8. Wait for the upload to finish.
9. Click the green **Publish release** button.

## 3. How to Share the Link
Once published, you can share the link directly to the release page. 

Users just need to click on the `.exe` file under the **Assets** section to download and install the app!
