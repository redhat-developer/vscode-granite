import { VscCircleLarge, VscPassFilled } from "react-icons/vsc";

export interface StatusCheckProps {
  checked: boolean
}

export const StatusCheck: React.FC<StatusCheckProps> = ({ checked }: StatusCheckProps) => {
  return (checked ?
    <VscPassFilled color="var(--vscode-textLink-foreground)" /> :
    <VscCircleLarge />
  );
};