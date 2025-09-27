package main

import (
	"fmt"
	"testing"
)

func TestMethod(t *testing.T) {

	gc := &GrpcmdService{}

	cc := gc.NonambiguousMethods("127.0.0.1:9000")

	fmt.Println(cc)
}

func TestMethodTemplate(t *testing.T) {

	gc := &GrpcmdService{}

	cc := gc.MethodTemplate("127.0.0.1:9000", "addsvc.Add.Sum")

	fmt.Println(cc)
}
