import React from "react";
import BuildingInformation from "../src/components/building-information/building-information.component";
import renderer from "react-test-renderer";
import { shallow } from "enzyme";
import { BuildingId } from "../src/types/main";
import { Buildings } from "../src/constants";

describe("BuildingInformation component", () => {
  it("should match snapshot", () => {
    const tree = renderer.create(<BuildingInformation />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("should check if clicking department links is functional", () => {
    const wrapper = shallow(
      <BuildingInformation
        tappedBuilding={BuildingId.H}
        showBuildingInfo={true}
      />
    );
    for (let i = 0; i < Buildings[0].departments.length; i++) {
      const departmentLink = wrapper.find({ nativeID: "departments" }).at(i);
      expect(departmentLink.prop("children")).toBe(
        Buildings[0].departments[i].title
      );
      departmentLink.simulate("press");
    }
  });

  it("should check if clicking service links is functional", () => {
    const wrapper = shallow(
      <BuildingInformation
        tappedBuilding={BuildingId.H}
        showBuildingInfo={true}
      />
    );
    for (let i = 0; i < Buildings[0].departments.length; i++) {
      const serviceLink = wrapper.find({ nativeID: "services" }).at(i);
      expect(serviceLink.prop("children")).toBe(Buildings[0].services[i].title);
      serviceLink.simulate("press");
    }
  });

  it("should call onClosePanel on 'x' button press", () => {
    mockOnClosePanel = jest.fn();
    const wrapper = shallow(
      <BuildingInformation
        tappedBuilding={BuildingId.H}
        showBuildingInfo={true}
        onClosePanel={mockOnClosePanel}
      />
    );
    const button = wrapper.find("TouchableOpacity");
    // NOTE: Cannot currently test
    // Waiting for answer: https://github.com/octopitus/rn-sliding-up-panel/issues/165
    // button.simulate("press");
  });
});
