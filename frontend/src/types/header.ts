// types/header.ts
export interface HeaderButton {
  icon?: string;
  alt?: string;
  text?: string;
  path?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  component?: React.ReactNode;
}

export interface HeaderConfig {
  title?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchPlaceholder?: string;
  buttons?: HeaderButton[];
  customContent?: React.ReactNode;
}

export interface UseHeaderConfigReturn {
  headerConfig: HeaderConfig;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
}