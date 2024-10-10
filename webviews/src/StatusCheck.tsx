import { VscCircleLargeFilled, VscCircleLarge, VscPassFilled } from "react-icons/vsc";

export interface StatusCheckProps {
  checked: boolean | null
}

export const StatusCheck: React.FC<StatusCheckProps> = ({ checked }: StatusCheckProps) => {
  return (checked === null ? (<VscCircleLargeFilled color="var(--vscode-textLink-foreground)" />) : (checked ?
    <VscPassFilled color="var(--vscode-textLink-foreground)" /> :
    <VscCircleLarge />
  ));
  
};