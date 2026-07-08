import {
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FolderInput,
  ScanLine,
  Settings,
  SlidersHorizontal,
  UsersRound
} from 'lucide-react';

// Icon per nav item (roleNav keys). ocrReview reuses ClipboardCheck.
export const navIcons = {
  scanInbox: ScanLine,
  batchCheck: ClipboardCheck,
  classify: FolderInput,
  ocrReview: ClipboardCheck,
  metadata: SlidersHorizontal,
  approvals: CheckCircle2,
  searchDocs: FileSearch,
  userAdmin: UsersRound,
  system: Settings
};
