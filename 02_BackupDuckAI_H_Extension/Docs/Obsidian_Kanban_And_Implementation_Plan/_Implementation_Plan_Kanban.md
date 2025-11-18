---
kanban-plugin: board
status: In Progress
---

## 📝 Backlog

- [ ] Document file format (.encrypted.md) #encryption
- [ ] Design folder settings UI #folders [🍅:: 1] ^h9cp
- [ ] Design schedule types (daily, weekly, monthly) #scheduling
- [ ] Plan multiple schedule support #scheduling
- [ ] Design schedule UI/UX #scheduling
- [ ] Plan notification system for auto-backups #scheduling
- [ ] Document error handling for failed scheduled backups #scheduling
- [ ] Design browser-specific subfolder structure #folders
- [ ] Plan date-based organization options #folders
- [ ] Document symlink setup instructions #folders
- [ ] Plan "Open Folder" functionality #folders
- [ ] Design cloud detection UI #cloud
- [ ] List common cloud paths (Dropbox, iCloud, OneDrive, Google Drive) #cloud
- [ ] Plan custom cloud path entry #cloud
- [ ] Design verification system #cloud
- [ ] Document user setup workflow #cloud
- [ ] Design settings.html layout #settings
- [ ] Plan settings categories (Organization, Security, Scheduling, etc.) #settings
- [ ] Design Pro feature indicators #settings
- [ ] Plan settings export/import #settings
- [ ] Document all settings with defaults #settings
- [ ] Research license key generation #license
- [ ] Choose payment platform (Gumroad recommended) #license
- [ ] Design license entry UI #license
- [ ] Plan license validation #license
- [ ] Design "Upgrade to Pro" prompts #license
- [ ] Document activation workflow #license


## 📋 To Do - Phase 1 (Testing)

- [ ] Test "☑️ Select All" button functionality #testing #phase1
- [ ] Test Quick Download with no selection (should warn) #testing #phase1
- [ ] Test Quick Download with selection (should work) #testing #phase1
- [ ] Test Full Backup after Quick Download #testing #phase1
- [ ] Verify Backup Status shows correct dates (Oct 15, not Oct 14) #testing #phase1
- [ ] Check View History matches Backup Status #testing #phase1
- [ ] Test in Firefox (primary browser) #testing #phase1
- [ ] Test in Chrome (if available) #testing #phase1
- [ ] Verify: Brave custom folders not created (expected limitation) #testing #phase1
- [ ] Verify: Font sizes readable in Chrome/Brave (14px base) #testing #phase1
- [ ] Verify: No console errors during Full Backup #testing #phase1


## 🚧 In Progress



## 🔮 Future - Pro Features

- [ ] Create settings.html file #phase3 #pro
- [ ] Create settings.js file #phase3 #pro
- [ ] Create settings.css file #phase3 #pro
- [ ] Create background.js service worker #phase3 #pro
- [ ] Create scheduler.js #phase3 #pro
- [ ] Create license.js validation #phase3 #pro
- [ ] Create activation.html page #phase3 #pro
- [ ] Create crypto.js utilities #phase3 #pro
- [ ] Create decrypt.html page #phase3 #pro
- [ ] Implement license validation system #phase3 #pro
- [ ] Implement Pro feature flag system #phase3 #pro
- [ ] Design settings storage schema #phase3 #pro
- [ ] Create cross-browser sync file (.backup_sync.json) #phase3 #pro
- [ ] Build encryption/decryption module #phase4 #pro
- [ ] Build scheduling module (alarms) #phase4 #pro
- [ ] Implement settings page (basic layout) #phase4 #pro
- [ ] Implement license key system #phase4 #pro
- [ ] Implement Pro feature flags #phase4 #pro
- [ ] Implement browser-specific folders #phase4 #pro
- [ ] Implement AES-256-GCM encryption #phase4 #pro #encryption
- [ ] Implement ChaCha20-Poly1305 encryption (Chrome/Edge) #phase4 #pro #encryption
- [ ] Implement password management #phase4 #pro #encryption
- [ ] Create decryption tool page #phase4 #pro #encryption
- [ ] Implement basic alarm system #phase4 #pro #scheduling
- [ ] Implement Quick Backup schedules (hourly, daily) #phase4 #pro #scheduling
- [ ] Implement Full Backup schedules (weekly, monthly) #phase4 #pro #scheduling
- [ ] Implement multiple schedule support #phase4 #pro #scheduling
- [ ] Implement schedule management UI #phase4 #pro #scheduling
- [ ] Implement cloud detection #phase4 #pro #polish
- [ ] Implement analytics dashboard #phase4 #pro #polish
- [ ] Implement backup reports #phase4 #pro #polish
- [ ] Implement advanced notifications #phase4 #pro #polish


## 🧪 Testing & Release

- [ ] Test all free features across browsers #phase5 #testing
- [ ] Test all Pro features across browsers #phase5 #testing
- [ ] Test license activation/deactivation #phase5 #testing
- [ ] Test encryption/decryption workflow #phase5 #testing
- [ ] Test scheduling in Firefox (primary) #phase5 #testing
- [ ] Test cross-browser status sync #phase5 #testing
- [ ] Performance testing (large backups) #phase5 #testing
- [ ] Security audit (encryption) #phase5 #testing
- [ ] Create user guide (free version) #phase5 #docs
- [ ] Create user guide (Pro version) #phase5 #docs
- [ ] Create FAQ page #phase5 #docs
- [ ] Create troubleshooting guide #phase5 #docs
- [ ] Create video tutorials #phase5 #docs
- [ ] Create store listings (Firefox Add-ons, Chrome Web Store) #phase5 #docs
- [ ] Create extension screenshots #phase5 #marketing
- [ ] Create feature comparison table (Free vs Pro) #phase5 #marketing
- [ ] Create landing page (optional) #phase5 #marketing
- [ ] Create social media graphics #phase5 #marketing
- [ ] Create demo video #phase5 #marketing


## 🚫 Blocked

- [ ] Pro features blocked until Phase 1 testing complete #blocked


## Kanban Metadata



## Phase Progress

- [ ] Phase 1 (Testing): 🟡 60% (code done, testing pending)
- [ ] Phase 2 (Planning): 🔴 0% (not started)
- [x] Phase 3 (Foundation): 🔴 0% (not started)
- [x] Phase 4 (Pro Features): 🔴 0% (not started)
- [x] Phase 5 (Release): 🔴 0% (not started)


## Tags Legend



## Notes

- [ ] `#phase1` = Current phase (testing)
- [ ] `#phase2` = Planning phase
- [ ] `#phase3` = Foundation building
- [ ] `#phase4` = Pro features implementation
- [ ] `#phase5` = Testing & release
- [ ] `#testing` = Testing tasks
- [ ] `#bugfix` = Bug fixes
- [ ] `#ux` = User experience improvements
- [ ] `#pro` = Pro version features
- [ ] `#encryption` = Encryption features
- [ ] `#scheduling` = Scheduling features
- [ ] `#folders` = Folder organization
- [ ] `#cloud` = Cloud integration
- [ ] `#settings` = Settings page
- [ ] `#license` = License system
- [ ] `#docs` = Documentation
- [ ] `#marketing` = Marketing materials
- [ ] `#blocked` = Blocked tasks
- [ ] Focus on Phase 1 completion before planning Pro features
- [ ] Keep free version solid and stable
- [ ] Pro features should enhance, not complicate
- [ ] Maintain privacy-first approach (local backups)
- [ ] Cross-browser compatibility is critical
- [ ] Research AES-256-GCM implementation #encryption
- [ ] Research ChaCha20-Poly1305 alternative #encryption
- [ ] Design password entry UI #encryption
- [ ] Design decryption tool page #encryption
- [ ] Load extension in Brave #testing #phase1
- [ ] Load conversations from duck.ai #testing #phase1


## ✅ Done - Phase 1 (Code)

- [x] Fixed "Select All" button behavior (no auto-select) #phase1 #ux
- [x] Added warning when no conversations selected #phase1 #ux
- [x] Smart button text toggle (Select All ↔ Deselect All) #phase1 #ux
- [x] Fixed Full Backup index mismatch (rebuilds items array) #phase1 #bugfix
- [x] Fixed Backup Status to show most recent backups (not oldest) #phase1 #bugfix ^qjq7
- [x] Plan key derivation (PBKDF2) #encryption
- [x] Research `browser.alarms` API #scheduling




%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[null]}
```
%%