import { Box } from "@mui/material";
import greenLeafBackground from "../../../../../assets/icons/green_leaf_join_choir.svg";
import greenBackground from "../../../../../assets/green_background.svg";

const JoinChoirBackground = () => {
  return (
    <>
      <Box
        component="img"
        src={greenBackground}
        alt="Green background"
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -2,
        }}
      />
      <Box
        component="img"
        src={greenLeafBackground}
        alt="Green leaf background"
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
        }}
      />
    </>
  );
};

export default JoinChoirBackground; 