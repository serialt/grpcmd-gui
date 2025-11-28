package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/textproto"
	"strings"

	"github.com/grpcmd/grpcmd-gui/internal/grpcmd"
)

type GrpcmdService struct{}

func (g *GrpcmdService) CallWithResult(address string, method string, metadata string, req string, protoPaths []string, protoFiles []string) grpcmd.Result {
	// metadata需要为ASCII字符，增加校验（
	if !isValidASCII(metadata) {
		return grpcmd.Result{
			Messages: []string{"Metadata contains non-ASCII characters."},
		}
	}
	fmt.Printf("metadata: %v\n", metadata)
	fmt.Printf("req: %v\n", req)
	_, data, _ := parseHeadersAndBodyFromFullRequest(req)

	_, header, _ := parseHeadersAndBodyFromFullRequest(metadata)
	headers := parseMetadata(header)

	ctx := grpcmd.NewContext()
	defer ctx.Free()
	if len(protoFiles) > 0 {
		err := ctx.SetFileSource(protoFiles, getExtendedProtoPaths(protoPaths, protoFiles))
		if err != nil {
			return grpcmd.Result{
				Messages: []string{err.Error()},
			}
		}
	}
	err := ctx.Connect(address)
	if err != nil {
		return grpcmd.Result{
			Messages: []string{err.Error()},
		}
	}
	res, err := ctx.CallWithResult(method, data, headers)
	if err != nil {
		return grpcmd.Result{
			Messages: []string{err.Error()},
		}
	}
	return *res
}

func (g *GrpcmdService) NonambiguousMethods(address string) []string {
	ctx := grpcmd.NewContext()
	defer ctx.Free()
	err := ctx.Connect(address)
	if err != nil {
		return []string{err.Error()}
	}
	res, err := ctx.NonambiguousMethods()
	if err != nil {
		return []string{err.Error()}
	}
	return res
}

func (g *GrpcmdService) MethodTemplate(address, method string) string {
	ctx := grpcmd.NewContext()
	defer ctx.Free()
	err := ctx.Connect(address)
	if err != nil {
		return err.Error()
	}
	describeMethod, err := ctx.DescribeMethod(method)
	if err != nil {
		return err.Error()
	}

	i := strings.Index(describeMethod, "Template:\n")
	if i == -1 {
		return "Unable to find method template."
	}
	data, _ := grpcmd.FormatMessagesToSnakeCase([]string{describeMethod[i+10:]})
	if len(data) == 1 {
		return data[0]
	}
	return ""
}

func parseHeadersAndBodyFromFullRequest(req string) ([]string, string, error) {
	reqTrimmed := strings.TrimSpace(req)
	if len(reqTrimmed) == 0 {
		return nil, "", nil
	}
	startOfFirstMessage := strings.Index(req, "{")
	if len(strings.TrimSpace(req[0:startOfFirstMessage])) == 0 {
		// If there is only whitespace before the start of the first message, there are no headers.
		return nil, req, nil
	}

	reader := bufio.NewReader(strings.NewReader(reqTrimmed))
	tp := textproto.NewReader(reader)
	mimeHeader, err := tp.ReadMIMEHeader()
	if err != nil {
		return nil, "", fmt.Errorf("error while parsing headers:\n\t%w", err)
	}

	httpHeaders := http.Header(mimeHeader)

	headers := []string{}
	for key, values := range httpHeaders {
		for _, v := range values {
			headers = append(headers, key+": "+v)
		}
	}

	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, "", fmt.Errorf("error while reading the data:\n\t%w", err)
	}

	return headers, string(data), nil
}

// func parseHeadersAndBodyFromFullRequest(req string) ([]string, string, error) {
// 	reqTrimmed := strings.TrimSpace(req)
// 	if len(reqTrimmed) == 0 {
// 		return nil, "", nil
// 	}

// 	lines := strings.Split(reqTrimmed, "\n")
// 	headers := []string{}
// 	bodyLines := []string{}
// 	foundBody := false

// 	for _, line := range lines {
// 		line = strings.TrimSpace(line)
// 		if !foundBody {
// 			if strings.HasPrefix(line, "{") {
// 				// 从这里开始是 body
// 				foundBody = true
// 				bodyLines = append(bodyLines, line)
// 				continue
// 			}
// 			// 非 { 开头的都当 header
// 			if line != "" {
// 				headers = append(headers, line)
// 			}
// 		} else {
// 			bodyLines = append(bodyLines, line)
// 		}
// 	}

// 	return headers, strings.Join(bodyLines, "\n"), nil
// }

func parseMetadata(header string) (metadata []string) {
	reqTrimmed := strings.TrimSpace(header)
	// 解析 JSON 到 map
	var m map[string]interface{}
	if err := json.Unmarshal([]byte(reqTrimmed), &m); err != nil {
		panic(err)
	}

	for k, v := range m {
		metadata = append(metadata, fmt.Sprintf("%s:%v", k, v))
	}
	return
}

// isValidASCII 检查字符串是否只包含可打印的 ASCII 字符（0x20 ~ 0x7E）
func isValidASCII(s string) bool {
	for _, r := range s {
		if r < 0x20 || r > 0x7E {
			return false
		}
	}
	return true
}
