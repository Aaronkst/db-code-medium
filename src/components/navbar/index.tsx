"use client";

import { AppContext } from "@/lib/context/app-context";
import { useContext } from "react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "../ui/navigation-menu";
import { Button } from "../ui/button";
import { MoonIcon, SunIcon } from "lucide-react";

export function AppNavbar() {
  const { colorTheme, setColorTheme } = useContext(AppContext);

  return (
    <div className="w-screen flex justify-between items-center p-2 border-b">
      <div>App</div>
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <Button
              size="icon"
              variant="ghost"
              onClick={() =>
                setColorTheme(colorTheme === "dark" ? "light" : "dark")
              }
            >
              {colorTheme === "dark" ? (
                <SunIcon size="0.8rem" />
              ) : (
                <MoonIcon size="0.8rem" />
              )}
            </Button>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
