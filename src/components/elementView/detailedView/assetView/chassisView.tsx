import * as React from "react";
import { RouteComponentProps } from "react-router";
import {
  AssetCPObject,
  AssetObject,
  isAssetCPObject,
  ROUTES,
} from "../../../../utils/utils";
import { withRouter } from "react-router-dom";
import { Classes, Tooltip } from "@blueprintjs/core";

interface ChassisViewProps {
  chassis: AssetObject;
  redirectToAsset(id: string): void;
  currBladeSlot?: string;
}

class ChassisView extends React.PureComponent<
  RouteComponentProps & ChassisViewProps
> {
  numSlots = 14;
  generateSlotNumbers() {
    const slots = [];
    for (let i = 1; i < this.numSlots + 1; i++) {
      if (this.props.currBladeSlot && parseInt(this.props.currBladeSlot) === i) {
        slots.push(
          <td style={{ border: "3px solid #EBF1F5 " }} className="slot-number">
            {i}
          </td>
        );
      } else {
        slots.push(<td className="slot-number">{i}</td>);
      }
    }
    return slots;
  }
  generateSlots() {
    const slots = [];
    let blades: Array<AssetObject> = [];

    for (let i = 1; i < this.numSlots + 1; i++) {
      if (this.props.chassis.blades) {
        blades = this.props.chassis.blades.filter(
          (asset: AssetObject | AssetCPObject) => {
            return parseInt(asset.chassis_slot) === i;
          }
        );

        let style = {};
        if (blades.length > 0) {
          const blade = blades[0];
          style = {
            backgroundColor: blade.display_color
              ? blade.display_color
              : blade.model.display_color,
          };
          if (
            this.props.currBladeSlot &&
            parseInt(this.props.currBladeSlot) === i
          ) {
            style = {
              backgroundColor: blade.display_color
                ? blade.display_color
                : blade.model.display_color,

              border: "3px solid #EBF1F5 ",
            };
          }

          slots.push(
            <td
              className="slot"
              onClick={() => {
                let blade_id;
                if (isAssetCPObject(blade) && blade.related_asset) {
                  blade_id = blade.related_asset.id;
                } else {
                  blade_id = blade.id;
                }
                this.props.history.push(ROUTES.ASSETS + "/" + blade_id);
                this.props.redirectToAsset(blade_id);
              }}
              style={style}
            >
              <Tooltip
                className={Classes.DARK}
                content={
                  "hostname: " +
                  blade.hostname +
                  "\n asset number: " +
                  blade.asset_number
                }
              >
                <div className="vertical">{blade.hostname}</div>
              </Tooltip>
            </td>
          );
        } else {
          slots.push(<td className="slot"></td>);
        }
      }
    }

    return slots;
  }

  render() {
    const chassisColor = this.props.chassis.display_color
      ? this.props.chassis.display_color
      : this.props.chassis.model.display_color;
    console.log(chassisColor);
    return (
      <div className="chassis-view">
        <table
          className=".bp3-interactive "
          style={{
            borderStyle: "solid",
            borderWidth: "10pt",
            borderColor: chassisColor,
          }}
        >
          <tbody>
            <tr>{this.generateSlotNumbers()}</tr>
            <tr>{this.generateSlots()}</tr>
            <tr>{this.generateSlotNumbers()}</tr>
          </tbody>
        </table>
      </div>
    );
  }
}
export default withRouter(ChassisView);
